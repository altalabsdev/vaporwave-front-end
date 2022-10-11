import React from "react";
import Footer from "../../Footer";

import cx from "classnames";

import "./Home.css";

import simpleSwapIcon from "../../img/ic_simpleswaps.svg";
import costIcon from "../../img/ic_cost.svg";
import liquidityIcon from "../../img/ic_liquidity.svg";
import totaluserIcon from "../../img/ic_totaluser.svg";

import auroraIcon from "../../img/ic_aurora_96.svg";

import statsIcon from "../../img/ic_stats.svg";
import tradingIcon from "../../img/ic_trading.svg";

import useSWR from "swr";

import {
  formatAmount,
  bigNumberify,
  numberWithCommas,
  getServerUrl,
  USD_DECIMALS,
  AURORA,
  getTotalVolumeSum,
} from "../../Helpers";

import { useUserStat } from "../../Api";

import TokenCard from "../../components/TokenCard/TokenCard";

export default function Home({ showRedirectModal, redirectPopupTimestamp }) {
  // const [openedFAQIndex, setOpenedFAQIndex] = useState(null)
  // const faqContent = [{
  //   id: 1,
  //   question: "What is VWAVE?",
  //   answer: "VWAVE is a decentralized spot and perpetual exchange that supports low swap fees and zero price impact trades.<br><br>Trading is supported by a unique multi-asset pool that earns liquidity providers fees from market making, swap fees, leverage trading (spreads, funding fees & liquidations), and asset rebalancing.<br><br>Dynamic pricing is supported by Chainlink Oracles along with TWAP pricing from leading volume DEXs."
  // }, {
  //   id: 2,
  //   question: "What is the VWAVE Governance Token? ",
  //   answer: "The VWAVE token is the governance token of the VWAVE ecosystem, it provides the token owner voting rights on the direction of the VWAVE platform.<br><br>Additionally, when VWAVE is staked you will earn 30% of the platform-generated fees, you will also earn Escrowed VWAVE tokens and Multiplier Points."
  // }, {
  //   id: 3,
  //   question: "What is the VLP Token? ",
  //   answer: "The VLP token represents the liquidity users provide to the VWAVE platform for Swaps and Margin Trading.<br><br>To provide liquidity to VLP you <a href='https://vaporwave.farm/buy_glp' target='_blank'>trade</a> your crypto asset BTC, ETH, LINK, UNI, USDC, USDT, MIM, or FRAX to the liquidity pool, in exchange, you gain exposure to a diversified index of tokens while earning 50% of the platform trading fees and esVWAVE."
  // }, {
  //   id: 4,
  //   question: "What can I trade on VWAVE? ",
  //   answer: "On VWAVE you can swap or margin trade any of the following assets: ETH, BTC, LINK, UNI, USDC, USDT, MIM, FRAX, with others to be added. "
  // }]

  // const toggleFAQContent = function(index) {
  //   if (openedFAQIndex === index) {
  //     setOpenedFAQIndex(null)
  //   } else {
  //     setOpenedFAQIndex(index)
  //   }
  // }

  // AURORA

  const auroraPositionStatsUrl = getServerUrl(AURORA, "/position_stats");
  const { data: auroraPositionStats } = useSWR([auroraPositionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const auroraTotalVolumeUrl = getServerUrl(AURORA, "/total_volume");
  const { data: auroraTotalVolume } = useSWR([auroraTotalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  // Total Volume

  const auroraTotalVolumeSum = getTotalVolumeSum(auroraTotalVolume);

  let totalVolumeSum = bigNumberify(0);
  if (auroraTotalVolumeSum) {
    totalVolumeSum = totalVolumeSum.add(auroraTotalVolumeSum);
  }

  // Open Interest

  let openInterest = bigNumberify(0);
  if (
    auroraPositionStats &&
    auroraPositionStats.totalLongPositionSizes &&
    auroraPositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest.add(auroraPositionStats.totalLongPositionSizes);
    openInterest = openInterest.add(auroraPositionStats.totalShortPositionSizes);
  }

  // user stat
  const auroraUserStats = useUserStat(AURORA);
  let totalUsers = 0;

  if (auroraUserStats && auroraUserStats.uniqueCount) {
    totalUsers += auroraUserStats.uniqueCount;
  }

  const LaunchExchangeButton = () => {
    return (
      <div className={cx("default-btn")} onClick={() => showRedirectModal("/trade")}>
        Launch Exchange
      </div>
    );
  };

  return (
    <div className="Home">
      <div className="Home-top">
        {/* <div className="Home-top-image"></div> */}
        <div className="Home-title-section-container default-container">
          <div className="Home-title-section">
            <div className="Home-title">
              Decentralized
              <br />
              Perpetual Exchange
            </div>
            <div className="Home-description">
              Trade BTC, ETH, AVAX and other top cryptocurrencies with up to 30x leverage directly from your wallet
            </div>
            <LaunchExchangeButton />
          </div>
        </div>
        <div className="Home-latest-info-container default-container">
          <div className="Home-latest-info-block">
            <img src={tradingIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Trading Volume</div>
              <div className="Home-latest-info__value">${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={statsIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Open Interest</div>
              <div className="Home-latest-info__value">${formatAmount(openInterest, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={totaluserIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Users</div>
              <div className="Home-latest-info__value">{numberWithCommas(totalUsers.toFixed(0))}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-benefits-section">
        <div className="Home-benefits default-container">
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={liquidityIcon} alt="liquidity" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Reduce Liquidation Risks</div>
            </div>
            <div className="Home-benefit-description">
              An aggregate of high-quality price feeds determine when liquidations occur. This keeps positions safe from
              temporary wicks.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={costIcon} alt="cost" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Save on Costs</div>
            </div>
            <div className="Home-benefit-description">
              Enter and exit positions with minimal spread and zero price impact. Get the optimal price without
              incurring additional costs.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={simpleSwapIcon} alt="simpleswap" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Simple Swaps</div>
            </div>
            <div className="Home-benefit-description">
              Open positions through a simple swap interface. Conveniently swap from any supported asset into the
              position of your choice.
            </div>
          </div>
        </div>
      </div>
      <div className="Home-cta-section">
        <div className="Home-cta-container default-container">
          <div className="Home-cta-info">
            <div className="Home-cta-info__title">Available on your preferred network</div>
            <div className="Home-cta-info__description">VWAVE is currently live on Aurora.</div>
          </div>
          <div className="Home-cta-options">
            <div className="Home-cta-option Home-cta-option-aurora">
              <div className="Home-cta-option-icon">
                <img src={auroraIcon} alt="aurora" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Aurora</div>
                <div className="Home-cta-option-action">
                  <LaunchExchangeButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-token-card-section">
        <div className="Home-token-card-container default-container">
          <div className="Home-token-card-info">
            <div className="Home-token-card-info__title">Two tokens create our ecosystem</div>
          </div>
          <TokenCard showRedirectModal={showRedirectModal} />
        </div>
      </div>

      {/* <div className="Home-video-section">
        <div className="Home-video-container default-container">
          <div className="Home-video-block">
            <img src={gmxBigIcon} alt="gmxbig" />
          </div>
        </div>
      </div> */}
      {/* <div className="Home-faqs-section">
        <div className="Home-faqs-container default-container">
          <div className="Home-faqs-introduction">
            <div className="Home-faqs-introduction__title">FAQs</div>
            <div className="Home-faqs-introduction__description">Most asked questions. If you wish to learn more, please head to our Documentation page.</div>
            <a href="https://gmxio.gitbook.io/gmx/" className="default-btn Home-faqs-documentation">Documentation</a>
          </div>
          <div className="Home-faqs-content-block">
            {
              faqContent.map((content, index) => (
                <div className="Home-faqs-content" key={index} onClick={() => toggleFAQContent(index)}>
                  <div className="Home-faqs-content-header">
                    <div className="Home-faqs-content-header__icon">
                      {
                        openedFAQIndex === index ? <FiMinus className="opened" /> : <FiPlus className="closed" />
                      }
                    </div>
                    <div className="Home-faqs-content-header__text">
                      { content.question }
                    </div>
                  </div>
                  <div className={ openedFAQIndex === index ? "Home-faqs-content-main opened" : "Home-faqs-content-main" }>
                    <div className="Home-faqs-content-main__text">
                      <div dangerouslySetInnerHTML={{__html: content.answer}} >
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div> */}
      <Footer showRedirectModal={showRedirectModal} redirectPopupTimestamp={redirectPopupTimestamp} />
    </div>
  );
}
