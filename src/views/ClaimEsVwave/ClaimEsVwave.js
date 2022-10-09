import React, { useState } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import {
  AURORA,
  PLACEHOLDER_ACCOUNT,
  useChainId,
  fetcher,
  formatAmount,
  formatAmountFree,
  parseValue,
  bigNumberify,
} from "../../Helpers";

import { getContract } from "../../Addresses";

import { callContract } from "../../Api";

import Token from "../../abis/Token.json";
import RewardReader from "../../abis/RewardReader.json";

import Checkbox from "../../components/Checkbox/Checkbox";

import "./ClaimEsVwave.css";

import auroraIcon from "../../img/ic_aurora_96.svg";

const VEST_WITH_VWAVE_ARB = "VEST_WITH_VWAVE_ARB";
const VEST_WITH_VLP_ARB = "VEST_WITH_VLP_ARB";
const VEST_WITH_VWAVE_AVAX = "VEST_WITH_VWAVE_AVAX";
const VEST_WITH_VLP_AVAX = "VEST_WITH_VLP_AVAX";

export function getVestingDataV2(vestingInfo) {
  if (!vestingInfo || vestingInfo.length === 0) {
    return;
  }

  const keys = ["vwaveVester", "vlpVester"];
  const data = {};
  const propsLength = 12;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      combinedAverageStakedAmount: vestingInfo[i * propsLength + 6],
      cumulativeReward: vestingInfo[i * propsLength + 7],
      transferredCumulativeReward: vestingInfo[i * propsLength + 8],
      bonusReward: vestingInfo[i * propsLength + 9],
      averageStakedAmount: vestingInfo[i * propsLength + 10],
      transferredAverageStakedAmount: vestingInfo[i * propsLength + 11],
    };

    data[key + "PairAmount"] = data[key].pairAmount;
    data[key + "VestedAmount"] = data[key].vestedAmount;
    data[key + "EscrowedBalance"] = data[key].escrowedBalance;
    data[key + "ClaimSum"] = data[key].claimedAmounts.add(data[key].claimable);
    data[key + "Claimable"] = data[key].claimable;
    data[key + "MaxVestableAmount"] = data[key].maxVestableAmount;
    data[key + "CombinedAverageStakedAmount"] = data[key].combinedAverageStakedAmount;
    data[key + "CumulativeReward"] = data[key].cumulativeReward;
    data[key + "TransferredCumulativeReward"] = data[key].transferredCumulativeReward;
    data[key + "BonusReward"] = data[key].bonusReward;
    data[key + "AverageStakedAmount"] = data[key].averageStakedAmount;
    data[key + "TransferredAverageStakedAmount"] = data[key].transferredAverageStakedAmount;
  }

  return data;
}

function getVestingValues({ minRatio, amount, vestingDataItem }) {
  if (!vestingDataItem || !amount || amount.eq(0)) {
    return;
  }

  let currentRatio = bigNumberify(0);

  const ratioMultiplier = 10000;
  const maxVestableAmount = vestingDataItem.maxVestableAmount;
  const nextMaxVestableEsVwave = maxVestableAmount.add(amount);

  const combinedAverageStakedAmount = vestingDataItem.combinedAverageStakedAmount;
  if (maxVestableAmount.gt(0)) {
    currentRatio = combinedAverageStakedAmount.mul(ratioMultiplier).div(maxVestableAmount);
  }

  const transferredCumulativeReward = vestingDataItem.transferredCumulativeReward;
  const nextTransferredCumulativeReward = transferredCumulativeReward.add(amount);
  const cumulativeReward = vestingDataItem.cumulativeReward;
  const totalCumulativeReward = cumulativeReward.add(nextTransferredCumulativeReward);

  let nextCombinedAverageStakedAmount = combinedAverageStakedAmount;

  if (combinedAverageStakedAmount.lt(totalCumulativeReward.mul(minRatio))) {
    const averageStakedAmount = vestingDataItem.averageStakedAmount;
    let nextTransferredAverageStakedAmount = totalCumulativeReward.mul(minRatio);
    nextTransferredAverageStakedAmount = nextTransferredAverageStakedAmount.sub(
      averageStakedAmount.mul(cumulativeReward).div(totalCumulativeReward)
    );
    nextTransferredAverageStakedAmount = nextTransferredAverageStakedAmount
      .mul(totalCumulativeReward)
      .div(nextTransferredCumulativeReward);

    nextCombinedAverageStakedAmount = averageStakedAmount
      .mul(cumulativeReward)
      .div(totalCumulativeReward)
      .add(nextTransferredAverageStakedAmount.mul(nextTransferredCumulativeReward).div(totalCumulativeReward));
  }

  const nextRatio = nextCombinedAverageStakedAmount.mul(ratioMultiplier).div(nextMaxVestableEsVwave);

  const initialStakingAmount = currentRatio.mul(maxVestableAmount);
  const nextStakingAmount = nextRatio.mul(nextMaxVestableEsVwave);

  return {
    maxVestableAmount,
    currentRatio,
    nextMaxVestableEsVwave,
    nextRatio,
    initialStakingAmount,
    nextStakingAmount,
  };
}

export default function ClaimEsVwave({ setPendingTxns }) {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const [selectedOption, setSelectedOption] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [value, setValue] = useState("");

  const isAurora = chainId === AURORA;

  const esVwaveIouAddress = getContract(chainId, "ES_VWAVE_IOU");

  const { data: esVwaveIouBalance } = useSWR(
    isAurora && [
      `ClaimEsVwave:esVwaveIouBalance:${active}`,
      chainId,
      esVwaveIouAddress,
      "balanceOf",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const arbRewardReaderAddress = getContract(AURORA, "RewardReader");

  const arbVesterAdddresses = [getContract(AURORA, "VwaveVester"), getContract(AURORA, "VlpVester")];

  const { data: arbVestingInfo } = useSWR(
    [
      `StakeV2:vestingInfo:${active}`,
      AURORA,
      arbRewardReaderAddress,
      "getVestingInfoV2",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(undefined, RewardReader, [arbVesterAdddresses]),
    }
  );

  const arbVestingData = getVestingDataV2(arbVestingInfo);

  let amount = parseValue(value, 18);

  let maxVestableAmount;
  let currentRatio;

  let nextMaxVestableEsVwave;
  let nextRatio;

  let initialStakingAmount;
  let nextStakingAmount;

  let stakingToken = "staked VWAVE";

  const shouldShowStakingAmounts = false;

  if (selectedOption === VEST_WITH_VWAVE_ARB && arbVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(4),
      amount,
      vestingDataItem: arbVestingData.vwaveVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsVwave, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }
  }

  if (selectedOption === VEST_WITH_VLP_ARB && arbVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(320),
      amount,
      vestingDataItem: arbVestingData.vlpVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsVwave, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }

    stakingToken = "VLP";
  }

  const getError = () => {
    if (!active) {
      return "Wallet not connected";
    }

    if (esVwaveIouBalance && esVwaveIouBalance.eq(0)) {
      return "No esVWAVE to claim";
    }

    if (!amount || amount.eq(0)) {
      return "Enter an amount";
    }

    if (selectedOption === "") {
      return "Select an option";
    }

    return false;
  };

  const error = getError();

  const getPrimaryText = () => {
    if (error) {
      return error;
    }

    if (isClaiming) {
      return "Claiming...";
    }

    return "Claim";
  };

  const isPrimaryEnabled = () => {
    return !error && !isClaiming;
  };

  const claim = () => {
    setIsClaiming(true);

    let receiver;

    if (selectedOption === VEST_WITH_VWAVE_ARB) {
      receiver = "0x544a6ec142Aa9A7F75235fE111F61eF2EbdC250a";
    }

    if (selectedOption === VEST_WITH_VLP_ARB) {
      receiver = "0x9d8f6f6eE45275A5Ca3C6f6269c5622b1F9ED515";
    }

    if (selectedOption === VEST_WITH_VWAVE_AVAX) {
      receiver = "0x171a321A78dAE0CDC0Ba3409194df955DEEcA746";
    }

    if (selectedOption === VEST_WITH_VLP_AVAX) {
      receiver = "0x28863Dd19fb52DF38A9f2C6dfed40eeB996e3818";
    }

    const contract = new ethers.Contract(esVwaveIouAddress, Token.abi, library.getSigner());
    callContract(chainId, contract, "transfer", [receiver, amount], {
      sentMsg: "Claim submitted!",
      failMsg: "Claim failed.",
      successMsg: "Claim completed!",
      setPendingTxns,
    })
      .then(async (res) => {})
      .finally(() => {
        setIsClaiming(false);
      });
  };

  return (
    <div className="ClaimEsVwave Page page-layout">
      <div className="Page-title-section mt-0">
        <div className="Page-title">Claim esVWAVE</div>
        {!isAurora && (
          <div className="Page-description">
            <br />
            Please switch your network to Aurora.
          </div>
        )}
        {isAurora && (
          <div>
            <div className="Page-description">
              <br />
              You have {formatAmount(esVwaveIouBalance, 18, 2, true)} esVWAVE (IOU) tokens.
              <br />
              <br />
              The address of the esVWAVE (IOU) token is {esVwaveIouAddress}.<br />
              The esVWAVE (IOU) token is transferrable. You can add the token to your wallet and send it to another
              address to claim if you'd like.
              <br />
              <br />
              Select your vesting option below then click "Claim".
              <br />
              After claiming, the esVWAVE tokens will be airdropped to your account on the selected network within 7
              days. <br />
              The esVWAVE tokens can be staked or vested at any time.
              <br />
              Your esVWAVE (IOU) balance will decrease by your claim amount after claiming, this is expected behaviour.
              <br />
              You can check your claim history{" "}
              <a
                href={`https://arbiscan.io/token/${esVwaveIouAddress}?a=${account}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>
              .
            </div>
            <br />
            <div className="ClaimEsVwave-vesting-options">
              <Checkbox
                className="aurora btn btn-primary btn-left btn-lg"
                isChecked={selectedOption === VEST_WITH_VWAVE_ARB}
                setIsChecked={() => setSelectedOption(VEST_WITH_VWAVE_ARB)}
              >
                <div className="ClaimEsVwave-option-label">Vest with VWAVE on Aurora</div>
                <img src={auroraIcon} alt="aurora" />
              </Checkbox>
              <Checkbox
                className="aurora btn btn-primary btn-left btn-lg"
                isChecked={selectedOption === VEST_WITH_VLP_ARB}
                setIsChecked={() => setSelectedOption(VEST_WITH_VLP_ARB)}
              >
                <div className="ClaimEsVwave-option-label">Vest with VLP on Aurora</div>
                <img src={auroraIcon} alt="aurora" />
              </Checkbox>
            </div>
            <br />
            {!error && (
              <div className="muted">
                You can currently vest a maximum of {formatAmount(maxVestableAmount, 18, 2, true)} esVWAVE tokens at a
                ratio of {formatAmount(currentRatio, 4, 2, true)} {stakingToken} to 1 esVWAVE.{" "}
                {shouldShowStakingAmounts && `${formatAmount(initialStakingAmount, 18, 2, true)}.`}
                <br />
                After claiming you will be able to vest a maximum of {formatAmount(
                  nextMaxVestableEsVwave,
                  18,
                  2,
                  true
                )}{" "}
                esVWAVE at a ratio of {formatAmount(nextRatio, 4, 2, true)} {stakingToken} to 1 esVWAVE.{" "}
                {shouldShowStakingAmounts && `${formatAmount(nextStakingAmount, 18, 2, true)}.`}
                <br />
                <br />
              </div>
            )}
            <div>
              <div className="ClaimEsVwave-input-label muted">Amount to claim</div>
              <div className="ClaimEsVwave-input-container">
                <input type="number" placeholder="0.0" value={value} onChange={(e) => setValue(e.target.value)} />
                {value !== formatAmountFree(esVwaveIouBalance, 18, 18) && (
                  <div
                    className="ClaimEsVwave-max-button"
                    onClick={() => setValue(formatAmountFree(esVwaveIouBalance, 18, 18))}
                  >
                    MAX
                  </div>
                )}
              </div>
            </div>
            <br />
            <div>
              <button className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()} onClick={() => claim()}>
                {getPrimaryText()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
