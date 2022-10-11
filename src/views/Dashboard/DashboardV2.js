import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TooltipComponent from "../../components/Tooltip/Tooltip";

import hexToRgba from "hex-to-rgba";
import { ethers } from "ethers";

import { getWhitelistedTokens, getTokenBySymbol } from "../../data/Tokens";
import { getFeeHistory } from "../../data/Fees";

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  getChainName,
  useChainId,
  USD_DECIMALS,
  VWAVE_DECIMALS,
  VLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  AURORA,
  getTotalVolumeSum,
  VLPPOOLCOLORS,
  DEFAULT_MAX_USDG_AMOUNT,
  getPageTitle,
  importImage,
  arrayURLFetcher,
} from "../../Helpers";
import {
  useTotalVwaveInLiquidity,
  useVwavePrice,
  useTotalVwaveStaked,
  useTotalVwaveSupply,
  useInfoTokens,
} from "../../Api";

import { getContract } from "../../Addresses";

import VaultV2 from "../../abis/VaultV2.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import VlpManager from "../../abis/VlpManager.json";
import Footer from "../../Footer";

import "./DashboardV2.css";

import vwave40Icon from "../../img/ic_vwave_40.svg";
import vlp40Icon from "../../img/ic_vlp_40.svg";
import aurora16Icon from "../../img/ic_aurora_16.svg";
import aurora24Icon from "../../img/ic_aurora_24.svg";

import AssetDropdown from "./AssetDropdown";
import SEO from "../../components/Common/SEO";
import TooltipCard from "./TooltipCard";
const ACTIVE_CHAIN_IDS = [AURORA];

const { AddressZero } = ethers.constants;

function getVolumeInfo(hourlyVolumes) {
  if (!hourlyVolumes || hourlyVolumes.length === 0) {
    return {};
  }
  const dailyVolumes = hourlyVolumes.map((hourlyVolume) => {
    const secondsPerHour = 60 * 60;
    const minTime = parseInt(Date.now() / 1000 / secondsPerHour) * secondsPerHour - 24 * secondsPerHour;
    const info = {};
    let totalVolume = bigNumberify(0);
    for (let i = 0; i < hourlyVolume.length; i++) {
      const item = hourlyVolume[i].data;
      if (parseInt(item.timestamp) < minTime) {
        break;
      }

      if (!info[item.token]) {
        info[item.token] = bigNumberify(0);
      }

      info[item.token] = info[item.token].add(item.volume);
      totalVolume = totalVolume.add(item.volume);
    }
    info.totalVolume = totalVolume;
    return info;
  });
  return dailyVolumes.reduce(
    (acc, cv, index) => {
      acc.totalVolume = acc.totalVolume.add(cv.totalVolume);
      acc[ACTIVE_CHAIN_IDS[index]] = cv;
      return acc;
    },
    { totalVolume: bigNumberify(0) }
  );
}

function getPositionStats(positionStats) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }
  return positionStats.reduce(
    (acc, cv, i) => {
      acc.totalLongPositionSizes = acc.totalLongPositionSizes.add(cv.totalLongPositionSizes);
      acc.totalShortPositionSizes = acc.totalShortPositionSizes.add(cv.totalShortPositionSizes);
      acc[ACTIVE_CHAIN_IDS[i]] = cv;
      return acc;
    },
    {
      totalLongPositionSizes: bigNumberify(0),
      totalShortPositionSizes: bigNumberify(0),
    }
  );
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0);
  }

  let currentFeesUsd = bigNumberify(0);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = fees[i].mul(tokenInfo.contractMinPrice).div(expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd.add(feeUsd);
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const { data: positionStats } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/position_stats")),
    {
      fetcher: arrayURLFetcher,
    }
  );

  const { data: hourlyVolumes } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/hourly_volume")),
    {
      fetcher: arrayURLFetcher,
    }
  );

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume");
  const { data: totalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  let { total: totalVwaveSupply } = useTotalVwaveSupply();

  const volumeInfo = getVolumeInfo(hourlyVolumes);
  const positionStatsInfo = getPositionStats(positionStats);

  const totalVolumeSum = getTotalVolumeSum(totalVolume);

  function getWhitelistedTokenAddresses(chainId) {
    const whitelistedTokens = getWhitelistedTokens(chainId);
    return whitelistedTokens.map((token) => token.address);
  }

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const vlpManagerAddress = getContract(chainId, "VlpManager");

  const vwaveAddress = getContract(chainId, "VWAVE");
  const vlpAddress = getContract(chainId, "VLP");

  const tokensForSupplyQuery = [vwaveAddress, vlpAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, vlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, VlpManager),
  });

  const { data: fees } = useSWR([`Dashboard:fees:${active}`, chainId, readerAddress, "getFees", vaultAddress], {
    fetcher: fetcher(library, ReaderV2, [whitelistedTokenAddresses]),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: fetcher(library, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`VlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  const { infoTokens: infoTokensAurora } = useInfoTokens(null, AURORA, active, undefined, undefined);

  const { data: feesInfo } = useSWR(infoTokensAurora[AddressZero].contractMinPrice ? "Dashboard:feesInfo" : null, {
    fetcher: () => {
      return Promise.all(
        ACTIVE_CHAIN_IDS.map((chainId) =>
          fetcher(null, ReaderV2, [getWhitelistedTokenAddresses(chainId)])(
            `Dashboard:fees:${chainId}`,
            chainId,
            getContract(chainId, "Reader"),
            "getFees",
            getContract(chainId, "Vault")
          )
        )
      ).then((fees) => {
        return fees.reduce(
          (acc, cv, i) => {
            const feeUSD = getCurrentFeesUsd(getWhitelistedTokenAddresses(ACTIVE_CHAIN_IDS[i]), cv, infoTokensAurora);
            acc[ACTIVE_CHAIN_IDS[i]] = feeUSD;
            acc.total = acc.total.add(feeUSD);
            return acc;
          },
          { total: bigNumberify(0) }
        );
      });
    },
  });

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];
  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens);
  const feeHistory = getFeeHistory(chainId);
  const shouldIncludeCurrrentFees = feeHistory.length && parseInt(Date.now() / 1000) - feeHistory[0].to > 60 * 60;
  let totalFeesDistributed = shouldIncludeCurrrentFees
    ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100
    : 0;
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd);
  }

  const { vwavePrice, vwavePriceFromAurora, vwavePriceFromAvalanche } = useVwavePrice(
    chainId,
    { aurora: chainId === AURORA ? library : undefined },
    active
  );

  let { total: totalVwaveInLiquidity } = useTotalVwaveInLiquidity(chainId, active);

  let { avax: avaxStakedVwave, aurora: auroraStakedVwave, total: totalStakedVwave } = useTotalVwaveStaked();

  let vwaveMarketCap;
  if (vwavePrice && totalVwaveSupply) {
    vwaveMarketCap = vwavePrice.mul(totalVwaveSupply).div(expandDecimals(1, VWAVE_DECIMALS));
  }

  let stakedVwaveSupplyUsd;
  if (vwavePrice && totalStakedVwave) {
    stakedVwaveSupplyUsd = totalStakedVwave.mul(vwavePrice).div(expandDecimals(1, VWAVE_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  let vlpPrice;
  let vlpSupply;
  let vlpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    vlpSupply = totalSupplies[3];
    vlpPrice =
      aum && aum.gt(0) && vlpSupply.gt(0)
        ? aum.mul(expandDecimals(1, VLP_DECIMALS)).div(vlpSupply)
        : expandDecimals(1, USD_DECIMALS);
    vlpMarketCap = vlpPrice.mul(vlpSupply).div(expandDecimals(1, VLP_DECIMALS));
  }

  let tvl;
  if (vlpMarketCap && vwavePrice && totalStakedVwave) {
    tvl = vlpMarketCap.add(vwavePrice.mul(totalStakedVwave).div(expandDecimals(1, VWAVE_DECIMALS)));
  }

  const ethFloorPriceFund = expandDecimals(350 + 148 + 384, 18);
  const vlpFloorPriceFund = expandDecimals(660001, 18);
  const usdcFloorPriceFund = expandDecimals(784598 + 200000, 30);

  let totalFloorPriceFundUsd;

  if (eth && eth.contractMinPrice && vlpPrice) {
    const ethFloorPriceFundUsd = ethFloorPriceFund.mul(eth.contractMinPrice).div(expandDecimals(1, eth.decimals));
    const vlpFloorPriceFundUsd = vlpFloorPriceFund.mul(vlpPrice).div(expandDecimals(1, 18));

    totalFloorPriceFundUsd = ethFloorPriceFundUsd.add(vlpFloorPriceFundUsd).add(usdcFloorPriceFund);
  }

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply.add(tokenInfo.usdgAmount);
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdgAmount ||
      !adjustedUsdgSupply ||
      adjustedUsdgSupply.eq(0) ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
    // use add(1).div(10).mul(10) to round numbers up
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights).add(1).div(10).mul(10);

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              Current Weight: {formatAmount(currentWeightBps, 2, 2, false)}%<br />
              Target Weight: {formatAmount(targetWeightBps, 2, 2, false)}%<br />
              <br />
              {currentWeightBps.lt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is below its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/buy_vlp" target="_blank" rel="noopener noreferrer">
                    buy VLP
                  </Link>{" "}
                  with {tokenInfo.symbol},&nbsp; and to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  {tokenInfo.symbol} for other tokens.
                </div>
              )}
              {currentWeightBps.gt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is above its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  tokens for {tokenInfo.symbol}.
                </div>
              )}
              <br />
              <div>
                <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
                  More Info
                </a>
              </div>
            </>
          );
        }}
      />
    );
  };

  let stakedPercent = 0;

  if (totalVwaveSupply && !totalVwaveSupply.isZero() && !totalStakedVwave.isZero()) {
    stakedPercent = totalStakedVwave.mul(100).div(totalVwaveSupply).toNumber();
  }

  let liquidityPercent = 0;

  if (totalVwaveSupply && !totalVwaveSupply.isZero() && totalVwaveInLiquidity) {
    liquidityPercent = totalVwaveInLiquidity.mul(100).div(totalVwaveSupply).toNumber();
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent;

  let vwaveDistributionData = [
    {
      name: "staked",
      value: stakedPercent,
      color: "#4353fa",
    },
    {
      name: "in liquidity",
      value: liquidityPercent,
      color: "#0598fa",
    },
    {
      name: "not staked",
      value: notStakedPercent,
      color: "#5c0af5",
    },
  ];

  const totalStatsStartDate = "01 Sep 2021";

  let stableVlp = 0;
  let totalVlp = 0;

  let vlpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdgAmount && adjustedUsdgSupply) {
      const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
      if (tokenInfo.isStable) {
        stableVlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      }
      totalVlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      return {
        fullname: token.name,
        name: token.symbol,
        value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
      };
    }
    return null;
  });

  let stablePercentage = totalVlp > 0 ? ((stableVlp * 100) / totalVlp).toFixed(2) : "0.0";

  vlpPool = vlpPool.filter(function (element) {
    return element !== null;
  });

  vlpPool = vlpPool.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  vwaveDistributionData = vwaveDistributionData.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  const [vwaveActiveIndex, setVWAVEActiveIndex] = useState(null);

  const onVWAVEDistributionChartEnter = (_, index) => {
    setVWAVEActiveIndex(index);
  };

  const onVWAVEDistributionChartLeave = (_, index) => {
    setVWAVEActiveIndex(null);
  };

  const [vlpActiveIndex, setVLPActiveIndex] = useState(null);

  const onVLPPoolChartEnter = (_, index) => {
    setVLPActiveIndex(index);
  };

  const onVLPPoolChartLeave = (_, index) => {
    setVLPActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="stats-label">
          <div className="stats-label-color" style={{ backgroundColor: payload[0].color }}></div>
          {payload[0].value}% {payload[0].name}
        </div>
      );
    }

    return null;
  };

  return (
    <SEO title={getPageTitle("Dashboard")}>
      <div className="default-container DashboardV2 page-layout">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">
              Stats {chainId === AURORA && <img src={aurora24Icon} alt="aurora24Icon" />}
            </div>
            <div className="Page-description">
              {chainName} Total Stats start from {totalStatsStartDate}.<br /> For detailed stats:{" "}
              {chainId === AURORA && (
                <a href="https://stats.vaporwave.farm" target="_blank" rel="noopener noreferrer">
                  https://stats.vaporwave.farm
                </a>
              )}
              .
            </div>
          </div>
        </div>
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <div className="App-card">
              <div className="App-card-title">Overview</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">AUM</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() =>
                        `Assets Under Management: VWAVE staked (All chains) + VLP pool (${chainName})`
                      }
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">VLP Pool</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Total value of tokens in VLP pool (${chainName})`}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">24h Volume</div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(volumeInfo?.[chainId]?.totalVolume, USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <TooltipCard
                          title="Volume"
                          aurora={volumeInfo?.[AURORA].totalVolume}
                          total={volumeInfo?.totalVolume}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Long Positions</div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId].totalLongPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <TooltipCard
                          title="Long Positions"
                          aurora={positionStatsInfo?.[AURORA].totalLongPositionSizes}
                          total={positionStatsInfo?.totalLongPositionSizes}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Short Positions</div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId].totalShortPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <TooltipCard
                          title="Short Positions"
                          aurora={positionStatsInfo?.[AURORA].totalShortPositionSizes}
                          total={positionStatsInfo?.totalShortPositionSizes}
                        />
                      )}
                    />
                  </div>
                </div>
                {feeHistory.length ? (
                  <div className="App-card-row">
                    <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                    <div>
                      <TooltipComponent
                        position="right-bottom"
                        className="nowrap"
                        handle={`$${formatAmount(feesInfo?.[chainId], USD_DECIMALS, 2, true)}`}
                        renderContent={() => (
                          <TooltipCard title="Fees" aurora={feesInfo?.[AURORA]} total={feesInfo?.total} />
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">Total Stats</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Total Fees</div>
                  <div>${numberWithCommas(totalFeesDistributed.toFixed(0))}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Total Volume</div>
                  <div>${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Floor Price Fund</div>
                  <div>${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              Tokens {chainId === AURORA && <img src={aurora24Icon} alt="aurora24Icon" />}
            </div>
            <div className="Page-description">Platform and VLP index tokens.</div>
          </div>
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--vwave">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={vwave40Icon} alt="vwave40Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">VWAVE</div>
                        <div className="App-card-title-mark-subtitle">VWAVE</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="VWAVE" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>
                        {!vwavePrice && "..."}
                        {vwavePrice && (
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={"$" + formatAmount(vwavePrice, USD_DECIMALS, 2, true)}
                            renderContent={() => (
                              <>
                                Price on Aurora: ${formatAmount(vwavePriceFromAurora, USD_DECIMALS, 2, true)}
                                <br />
                                Price on Avalanche: ${formatAmount(vwavePriceFromAvalanche, USD_DECIMALS, 2, true)}
                              </>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(totalVwaveSupply, VWAVE_DECIMALS, 0, true)} VWAVE</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>
                        <TooltipComponent
                          position="right-bottom"
                          className="nowrap"
                          handle={`$${formatAmount(stakedVwaveSupplyUsd, USD_DECIMALS, 0, true)}`}
                          renderContent={() => (
                            <>
                              <p className="Tooltip-row">
                                <span className="label">Staked on Aurora:</span>
                                <span>{formatAmount(auroraStakedVwave, VWAVE_DECIMALS, 0, true)} VWAVE</span>
                              </p>
                              <p className="Tooltip-row">
                                <span className="label">Staked on Avalanche:</span>
                                <span>{formatAmount(avaxStakedVwave, VWAVE_DECIMALS, 0, true)} VWAVE</span>
                              </p>
                              <div className="Tooltip-divider" />
                              <p className="Tooltip-row">
                                <span className="label">Total:</span>
                                <span>{formatAmount(totalStakedVwave, VWAVE_DECIMALS, 0, true)} VWAVE</span>
                              </p>
                            </>
                          )}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(vwaveMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseLeave={onVWAVEDistributionChartLeave}>
                  {vwaveDistributionData.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={vwaveDistributionData}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        onMouseEnter={onVWAVEDistributionChartEnter}
                        onMouseOut={onVWAVEDistributionChartLeave}
                        onMouseLeave={onVWAVEDistributionChartLeave}
                      >
                        {vwaveDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{
                              filter:
                                vwaveActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={entry.color}
                            strokeWidth={vwaveActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        Distribution
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={vlp40Icon} alt="vlp40Icon" />
                        {/* <img src={aurora16Icon} alt="aurora16Icon" className="selected-network-symbol"/> */}
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">VLP</div>
                        <div className="App-card-title-mark-subtitle">VLP</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="VLP" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>${formatAmount(vlpPrice, USD_DECIMALS, 3, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(vlpSupply, VLP_DECIMALS, 0, true)} VLP</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>${formatAmount(vlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(vlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Stablecoin Percentage</div>
                      <div>{stablePercentage}%</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseOut={onVLPPoolChartLeave}>
                  {vlpPool.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={vlpPool}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        onMouseEnter={onVLPPoolChartEnter}
                        onMouseOut={onVLPPoolChartLeave}
                        onMouseLeave={onVLPPoolChartLeave}
                        paddingAngle={2}
                      >
                        {vlpPool.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={VLPPOOLCOLORS[entry.name]}
                            style={{
                              filter:
                                vlpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(VLPPOOLCOLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={VLPPOOLCOLORS[entry.name]}
                            strokeWidth={vlpActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        VLP Pool
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
            <div className="token-table-wrapper App-card">
              <div className="App-card-title">
                VLP Index Composition {chainId === AURORA && <img src={aurora16Icon} alt="aurora16Icon" />}
              </div>
              <div className="App-card-divider"></div>
              <table className="token-table">
                <thead>
                  <tr>
                    <th>TOKEN</th>
                    <th>PRICE</th>
                    <th>POOL</th>
                    <th>WEIGHT</th>
                    <th>UTILIZATION</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTokens.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }
                    const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_40.svg");

                    return (
                      <tr key={token.symbol}>
                        <td>
                          <div className="token-symbol-wrapper">
                            <div className="App-card-title-info">
                              <div className="App-card-title-info-icon">
                                <img src={tokenImage} alt={token.symbol} width="40px" />
                              </div>
                              <div className="App-card-title-info-text">
                                <div className="App-card-info-title">{token.name}</div>
                                <div className="App-card-info-subtitle">{token.symbol}</div>
                              </div>
                              <div>
                                <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                        <td>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Target Min Amount:{" "}
                                  {formatKeyAmount(tokenInfo, "bufferAmount", token.decimals, 2, true)} {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </td>
                        <td>{getWeightText(tokenInfo)}</td>
                        <td>{formatAmount(utilization, 2, 2, false)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="token-grid">
              {visibleTokens.map((token) => {
                const tokenInfo = infoTokens[token.address];
                let utilization = bigNumberify(0);
                if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                  utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                }
                let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                  maxUsdgAmount = tokenInfo.maxUsdgAmount;
                }

                const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_24.svg");
                return (
                  <div className="App-card" key={token.symbol}>
                    <div className="App-card-title">
                      <div className="mobile-token-card">
                        <img src={tokenImage} alt={token.symbol} width="20px" />
                        <div className="token-symbol-text">{token.symbol}</div>
                        <div>
                          <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">Price</div>
                        <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Pool</div>
                        <div>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Target Min Amount:{" "}
                                  {formatKeyAmount(tokenInfo, "bufferAmount", token.decimals, 2, true)} {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Weight</div>
                        <div>{getWeightText(tokenInfo)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Utilization</div>
                        <div>{formatAmount(utilization, 2, 2, false)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
