import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";

import Modal from "../../components/Modal/Modal";
import Checkbox from "../../components/Checkbox/Checkbox";
import Tooltip from "../../components/Tooltip/Tooltip";
import Footer from "../../Footer";

import Vault from "../../abis/Vault.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import Vester from "../../abis/Vester.json";
import RewardRouter from "../../abis/RewardRouter.json";
import RewardReader from "../../abis/RewardReader.json";
import Token from "../../abis/Token.json";
import VlpManager from "../../abis/VlpManager.json";

import { ethers } from "ethers";
import {
  helperToast,
  bigNumberify,
  fetcher,
  formatAmount,
  formatKeyAmount,
  formatAmountFree,
  getChainName,
  expandDecimals,
  parseValue,
  approveTokens,
  getServerUrl,
  useLocalStorageSerializeKey,
  useChainId,
  VLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  AURORA,
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
  getPageTitle,
} from "../../Helpers";
import { callContract, useVwavePrice, useTotalVwaveStaked, useTotalVwaveSupply } from "../../Api";
import { getConstant } from "../../Constants";

import useSWR from "swr";

import { getContract } from "../../Addresses";

import "./StakeV2.css";
import SEO from "../../components/Common/SEO";

const { AddressZero } = ethers.constants;

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    library,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && stakingTokenAddress && [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  let amount = parseValue(value, 18);
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance);

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "Enter an amount";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, stakeMethodName, [amount], {
      sentMsg: "Stake submitted!",
      failMsg: "Stake failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return `Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return `Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return "Staking...";
    }
    return "Stake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Stake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    library,
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    multiplierPointsAmount,
    reservedAmount,
    bonusVwaveInFeeVwave,
    setPendingTxns,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);
  let burnAmount;

  if (
    multiplierPointsAmount &&
    multiplierPointsAmount.gt(0) &&
    amount &&
    amount.gt(0) &&
    bonusVwaveInFeeVwave &&
    bonusVwaveInFeeVwave.gt(0)
  ) {
    burnAmount = multiplierPointsAmount.mul(amount).div(bonusVwaveInFeeVwave);
  }

  const shouldShowReductionAmount = true;
  let rewardReductionBasisPoints;
  if (burnAmount && bonusVwaveInFeeVwave) {
    rewardReductionBasisPoints = burnAmount.mul(BASIS_POINTS_DIVISOR).div(bonusVwaveInFeeVwave);
  }

  const getError = () => {
    if (!amount) {
      return "Enter an amount";
    }
    if (amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(chainId, contract, unstakeMethodName, [amount], {
      sentMsg: "Unstake submitted!",
      failMsg: "Unstake failed.",
      successMsg: "Unstake completed!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return "Unstaking...";
    }
    return "Unstake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Unstake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{unstakingTokenSymbol}</div>
          </div>
        </div>
        {reservedAmount && reservedAmount.gt(0) && (
          <div className="Modal-note">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </div>
        )}
        {burnAmount && burnAmount.gt(0) && rewardReductionBasisPoints && rewardReductionBasisPoints.gt(0) && (
          <div className="Modal-note">
            Unstaking will burn&nbsp;
            <a href="https://gmxio.gitbook.io/gmx/rewards" target="_blank" rel="noopener noreferrer">
              {formatAmount(burnAmount, 18, 4, true)} Multiplier Points
            </a>
            .&nbsp;
            {shouldShowReductionAmount && (
              <span>Boost Percentage: -{formatAmount(rewardReductionBasisPoints, 2, 2)}%.</span>
            )}
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function VesterDepositModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    balance,
    vestedAmount,
    averageStakedAmount,
    maxVestableAmount,
    library,
    stakeTokenLabel,
    reserveAmount,
    maxReserveAmount,
    vesterAddress,
    setPendingTxns,
  } = props;
  const [isDepositing, setIsDepositing] = useState(false);

  let amount = parseValue(value, 18);

  let nextReserveAmount = reserveAmount;

  let nextDepositAmount = vestedAmount;
  if (amount) {
    nextDepositAmount = vestedAmount.add(amount);
  }

  let additionalReserveAmount = bigNumberify(0);
  if (amount && averageStakedAmount && maxVestableAmount && maxVestableAmount.gt(0)) {
    nextReserveAmount = nextDepositAmount.mul(averageStakedAmount).div(maxVestableAmount);
    if (nextReserveAmount.gt(reserveAmount)) {
      additionalReserveAmount = nextReserveAmount.sub(reserveAmount);
    }
  }

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "Enter an amount";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
    if (nextReserveAmount.gt(maxReserveAmount)) {
      return "Insufficient staked tokens";
    }
  };

  const onClickPrimary = () => {
    setIsDepositing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "deposit", [amount], {
      sentMsg: "Deposit submitted!",
      failMsg: "Deposit failed!",
      successMsg: "Deposited!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isDepositing) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isDepositing) {
      return "Depositing...";
    }
    return "Deposit";
  };

  return (
    <SEO title={getPageTitle("Earn")}>
      <div className="StakeModal">
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">
                <div className="Exchange-swap-usd">Deposit</div>
              </div>
              <div
                className="muted align-right clickable"
                onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}
              >
                Max: {formatAmount(maxAmount, 18, 4, true)}
              </div>
            </div>
            <div className="Exchange-swap-section-bottom">
              <div>
                <input
                  type="number"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="PositionEditor-token-symbol">esVWAVE</div>
            </div>
          </div>
          <div className="VesterDepositModal-info-rows">
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Wallet</div>
              <div className="align-right">{formatAmount(balance, 18, 2, true)} esVWAVE</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Vault Capacity</div>
              <div className="align-right">
                <Tooltip
                  handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
                    maxVestableAmount,
                    18,
                    2,
                    true
                  )}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        Vault Capacity for your Account
                        <br />
                        <br />
                        Deposited: {formatAmount(vestedAmount, 18, 2, true)} esVWAVE
                        <br />
                        Max Capacity: {formatAmount(maxVestableAmount, 18, 2, true)} esVWAVE
                        <br />
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Reserve Amount</div>
              <div className="align-right">
                <Tooltip
                  handle={`${formatAmount(
                    reserveAmount && reserveAmount.gte(additionalReserveAmount)
                      ? reserveAmount
                      : additionalReserveAmount,
                    18,
                    2,
                    true
                  )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        Current Reserved: {formatAmount(reserveAmount, 18, 2, true)}
                        <br />
                        Additional reserve required: {formatAmount(additionalReserveAmount, 18, 2, true)}
                        <br />
                        {amount && nextReserveAmount.gt(maxReserveAmount) && (
                          <div>
                            <br />
                            You need a total of at least {formatAmount(nextReserveAmount, 18, 2, true)}{" "}
                            {stakeTokenLabel} to vest {formatAmount(amount, 18, 2, true)} esVWAVE.
                          </div>
                        )}
                      </>
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <div className="Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </Modal>
      </div>
    </SEO>
  );
}

function VesterWithdrawModal(props) {
  const { isVisible, setIsVisible, chainId, title, library, vesterAddress, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const onClickPrimary = () => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: "Withdraw submitted.",
      failMsg: "Withdraw failed.",
      successMsg: "Withdrawn!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div>
          This will withdraw and unreserve all tokens as well as pause vesting.
          <br />
          <br />
          esVWAVE tokens that have been converted to VWAVE will remain as VWAVE tokens.
          <br />
          <br />
          To claim VWAVE tokens without withdrawing, use the "Claim" button under the Total Rewards section.
          <br />
          <br />
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={isWithdrawing}>
            {!isWithdrawing && "Confirm Withdraw"}
            {isWithdrawing && "Confirming..."}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CompoundModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    active,
    account,
    library,
    chainId,
    setPendingTxns,
    totalVesterRewards,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isCompounding, setIsCompounding] = useState(false);
  const [shouldClaimVwave, setShouldClaimVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-vwave"],
    true
  );
  const [shouldStakeVwave, setShouldStakeVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-vwave"],
    true
  );
  const [shouldClaimEsVwave, setShouldClaimEsVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-es-vwave"],
    true
  );
  const [shouldStakeEsVwave, setShouldStakeEsVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-es-vwave"],
    true
  );
  const [shouldStakeMultiplierPoints, setShouldStakeMultiplierPoints] = useState(true);
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-convert-weth"],
    true
  );

  const vwaveAddress = getContract(chainId, "VWAVE");
  const stakedVwaveTrackerAddress = getContract(chainId, "StakedVwaveTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && [active, chainId, vwaveAddress, "allowance", account, stakedVwaveTrackerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const needApproval =
    shouldStakeVwave && tokenAllowance && totalVesterRewards && totalVesterRewards.gt(tokenAllowance);

  const isPrimaryEnabled = () => {
    return !isCompounding && !isApproving && !isCompounding;
  };

  const getPrimaryText = () => {
    if (isApproving) {
      return `Approving VWAVE...`;
    }
    if (needApproval) {
      return `Approve VWAVE`;
    }
    if (isCompounding) {
      return "Compounding...";
    }
    return "Compound";
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: vwaveAddress,
        spender: stakedVwaveTrackerAddress,
        chainId,
      });
      return;
    }

    setIsCompounding(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimVwave || shouldStakeVwave,
        shouldStakeVwave,
        shouldClaimEsVwave || shouldStakeEsVwave,
        shouldStakeEsVwave,
        shouldStakeMultiplierPoints,
        shouldClaimWeth || shouldConvertWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: "Compound submitted!",
        failMsg: "Compound failed.",
        successMsg: "Compound completed!",
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsCompounding(false);
      });
  };

  const toggleShouldStakeVwave = (value) => {
    if (value) {
      setShouldClaimVwave(true);
    }
    setShouldStakeVwave(value);
  };

  const toggleShouldStakeEsVwave = (value) => {
    if (value) {
      setShouldClaimEsVwave(true);
    }
    setShouldStakeEsVwave(value);
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Compound Rewards">
        <div className="CompoundModal-menu">
          <div>
            <Checkbox
              isChecked={shouldStakeMultiplierPoints}
              setIsChecked={setShouldStakeMultiplierPoints}
              disabled={true}
            >
              Stake Multiplier Points
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimVwave} setIsChecked={setShouldClaimVwave} disabled={shouldStakeVwave}>
              Claim VWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeVwave} setIsChecked={toggleShouldStakeVwave}>
              Stake VWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsVwave} setIsChecked={setShouldClaimEsVwave} disabled={shouldStakeEsVwave}>
              Claim esVWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeEsVwave} setIsChecked={toggleShouldStakeEsVwave}>
              Stake esVWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              Claim {wrappedTokenSymbol} Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    library,
    chainId,
    setPendingTxns,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const [shouldClaimVwave, setShouldClaimVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-vwave"],
    true
  );
  const [shouldClaimEsVwave, setShouldClaimEsVwave] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-es-vwave"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-convert-weth"],
    true
  );

  const isPrimaryEnabled = () => {
    return !isClaiming;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return `Claiming...`;
    }
    return "Claim";
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimVwave,
        false, // shouldStakeVwave
        shouldClaimEsVwave,
        false, // shouldStakeEsVwave
        false, // shouldStakeMultiplierPoints
        shouldClaimWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: "Claim submitted.",
        failMsg: "Claim failed.",
        successMsg: "Claim completed!",
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Claim Rewards">
        <div className="CompoundModal-menu">
          <div>
            <Checkbox isChecked={shouldClaimVwave} setIsChecked={setShouldClaimVwave}>
              Claim VWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsVwave} setIsChecked={setShouldClaimEsVwave}>
              Claim esVWAVE Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              Claim {wrappedTokenSymbol} Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV2({ setPendingTxns, connectWallet }) {
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const hasInsurance = true;

  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState("");
  const [vesterDepositBalance, setVesterDepositBalance] = useState("");
  const [vesterDepositEscrowedBalance, setVesterDepositEscrowedBalance] = useState("");
  const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState("");
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState("");
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState("");
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState("");
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState("");
  const [vesterDepositAddress, setVesterDepositAddress] = useState("");

  const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState(false);
  const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const vwaveAddress = getContract(chainId, "VWAVE");
  const esVwaveAddress = getContract(chainId, "ES_VWAVE");
  const bnVwaveAddress = getContract(chainId, "BN_VWAVE");
  const vlpAddress = getContract(chainId, "VLP");

  const stakedVwaveTrackerAddress = getContract(chainId, "StakedVwaveTracker");
  const bonusVwaveTrackerAddress = getContract(chainId, "BonusVwaveTracker");
  const feeVwaveTrackerAddress = getContract(chainId, "FeeVwaveTracker");

  const stakedVlpTrackerAddress = getContract(chainId, "StakedVlpTracker");
  const feeVlpTrackerAddress = getContract(chainId, "FeeVlpTracker");

  const vlpManagerAddress = getContract(chainId, "VlpManager");

  const stakedVwaveDistributorAddress = getContract(chainId, "StakedVwaveDistributor");
  const stakedVlpDistributorAddress = getContract(chainId, "StakedVlpDistributor");

  const vwaveVesterAddress = getContract(chainId, "VwaveVester");
  const vlpVesterAddress = getContract(chainId, "VlpVester");

  const vesterAddresses = [vwaveVesterAddress, vlpVesterAddress];

  const excludedEsVwaveAccounts = [stakedVwaveDistributorAddress, stakedVlpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  const walletTokens = [vwaveAddress, esVwaveAddress, vlpAddress, stakedVwaveTrackerAddress];
  const depositTokens = [
    vwaveAddress,
    esVwaveAddress,
    stakedVwaveTrackerAddress,
    bonusVwaveTrackerAddress,
    bnVwaveAddress,
    vlpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedVwaveTrackerAddress,
    stakedVwaveTrackerAddress,
    bonusVwaveTrackerAddress,
    feeVwaveTrackerAddress,
    feeVwaveTrackerAddress,
    feeVlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedVwaveTrackerAddress,
    bonusVwaveTrackerAddress,
    feeVwaveTrackerAddress,
    stakedVlpTrackerAddress,
    feeVlpTrackerAddress,
  ];

  const { data: walletBalances } = useSWR(
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [
      `StakeV2:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedVwaveSupply } = useSWR(
    [`StakeV2:stakedVwaveSupply:${active}`, chainId, vwaveAddress, "balanceOf", stakedVwaveTrackerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, vlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, VlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: fetcher(library, Vault),
    }
  );

  const { data: esVwaveSupply } = useSWR(
    [`StakeV2:esVwaveSupply:${active}`, chainId, readerAddress, "getTokenSupply", esVwaveAddress],
    {
      fetcher: fetcher(library, ReaderV2, [excludedEsVwaveAccounts]),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, ReaderV2, [vesterAddresses]),
    }
  );

  const { vwavePrice, vwavePriceFromAurora } = useVwavePrice(
    chainId,
    { aurora: chainId === AURORA ? library : undefined },
    active
  );

  let { total: totalVwaveSupply } = useTotalVwaveSupply();

  let { aurora: auroraVwaveStaked, total: totalVwaveStaked } = useTotalVwaveStaked();

  const vwaveSupplyUrl = getServerUrl(chainId, "/vwave_supply");
  const { data: vwaveSupply } = useSWR([vwaveSupplyUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

  const isVwaveTransferEnabled = true;

  let esVwaveSupplyUsd;
  if (esVwaveSupply && vwavePrice) {
    esVwaveSupplyUsd = esVwaveSupply.mul(vwavePrice).div(expandDecimals(1, 18));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances);
  const depositBalanceData = getDepositBalanceData(depositBalances);
  const stakingData = getStakingData(stakingInfo);
  const vestingData = getVestingData(vestingInfo);

  const processedData = getProcessedData(
    balanceData,
    supplyData,
    depositBalanceData,
    stakingData,
    vestingData,
    aum,
    nativeTokenPrice,
    stakedVwaveSupply,
    vwavePrice,
    vwaveSupply
  );

  let hasMultiplierPoints = false;
  let multiplierPointsAmount;
  if (processedData && processedData.bonusVwaveTrackerRewards && processedData.bnVwaveInFeeVwave) {
    multiplierPointsAmount = processedData.bonusVwaveTrackerRewards.add(processedData.bnVwaveInFeeVwave);
    if (multiplierPointsAmount.gt(0)) {
      hasMultiplierPoints = true;
    }
  }
  let totalRewardTokens;
  if (processedData && processedData.bnVwaveInFeeVwave && processedData.bonusVwaveInFeeVwave) {
    totalRewardTokens = processedData.bnVwaveInFeeVwave.add(processedData.bonusVwaveInFeeVwave);
  }

  let totalRewardTokensAndVlp;
  if (totalRewardTokens && processedData && processedData.vlpBalance) {
    totalRewardTokensAndVlp = totalRewardTokens.add(processedData.vlpBalance);
  }

  const bonusVwaveInFeeVwave = processedData ? processedData.bonusVwaveInFeeVwave : undefined;

  let stakedVwaveSupplyUsd;
  if (!totalVwaveStaked.isZero() && vwavePrice) {
    stakedVwaveSupplyUsd = totalVwaveStaked.mul(vwavePrice).div(expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalVwaveSupply && !totalVwaveSupply.isZero() && vwavePrice) {
    totalSupplyUsd = totalVwaveSupply.mul(vwavePrice).div(expandDecimals(1, 18));
  }

  let maxUnstakeableVwave = bigNumberify(0);
  if (
    totalRewardTokens &&
    vestingData &&
    vestingData.vwaveVesterPairAmount &&
    multiplierPointsAmount &&
    processedData.bonusVwaveInFeeVwave
  ) {
    const availableTokens = totalRewardTokens.sub(vestingData.vwaveVesterPairAmount);
    const stakedTokens = processedData.bonusVwaveInFeeVwave;
    const divisor = multiplierPointsAmount.add(stakedTokens);
    if (divisor.gt(0)) {
      maxUnstakeableVwave = availableTokens.mul(stakedTokens).div(divisor);
    }
  }

  const showStakeVwaveModal = () => {
    if (!isVwaveTransferEnabled) {
      helperToast.error("VWAVE transfers not yet enabled");
      return;
    }

    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake VWAVE");
    setStakeModalMaxAmount(processedData.vwaveBalance);
    setStakeValue("");
    setStakingTokenSymbol("VWAVE");
    setStakingTokenAddress(vwaveAddress);
    setStakingFarmAddress(stakedVwaveTrackerAddress);
    setStakeMethodName("stakeVwave");
  };

  const showStakeEsVwaveModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake esVWAVE");
    setStakeModalMaxAmount(processedData.esVwaveBalance);
    setStakeValue("");
    setStakingTokenSymbol("esVWAVE");
    setStakingTokenAddress(esVwaveAddress);
    setStakingFarmAddress(AddressZero);
    setStakeMethodName("stakeEsVwave");
  };

  const showVwaveVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.vwaveVester.maxVestableAmount.sub(vestingData.vwaveVester.vestedAmount);
    if (processedData.esVwaveBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esVwaveBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle("VWAVE Vault");
    setVesterDepositStakeTokenLabel("staked VWAVE + esVWAVE + Multiplier Points");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esVwaveBalance);
    setVesterDepositEscrowedBalance(vestingData.vwaveVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData.vwaveVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.vwaveVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.vwaveVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.vwaveVester.pairAmount);
    setVesterDepositMaxReserveAmount(totalRewardTokens);
    setVesterDepositValue("");
    setVesterDepositAddress(vwaveVesterAddress);
  };

  const showVlpVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.vlpVester.maxVestableAmount.sub(vestingData.vlpVester.vestedAmount);
    if (processedData.esVwaveBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esVwaveBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle("VLP Vault");
    setVesterDepositStakeTokenLabel("staked VLP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esVwaveBalance);
    setVesterDepositEscrowedBalance(vestingData.vlpVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData.vlpVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.vlpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.vlpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.vlpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData.vlpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(vlpVesterAddress);
  };

  const showVwaveVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.vwaveVesterVestedAmount || vestingData.vwaveVesterVestedAmount.eq(0)) {
      helperToast.error("You have not deposited any tokens for vesting.");
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle("Withdraw from VWAVE Vault");
    setVesterWithdrawAddress(vwaveVesterAddress);
  };

  const showVlpVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.vlpVesterVestedAmount || vestingData.vlpVesterVestedAmount.eq(0)) {
      helperToast.error("You have not deposited any tokens for vesting.");
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle("Withdraw from VLP Vault");
    setVesterWithdrawAddress(vlpVesterAddress);
  };

  const showUnstakeVwaveModal = () => {
    if (!isVwaveTransferEnabled) {
      helperToast.error("VWAVE transfers not yet enabled");
      return;
    }
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake VWAVE");
    let maxAmount = processedData.vwaveInStakedVwave;
    if (
      processedData.vwaveInStakedVwave &&
      vestingData &&
      vestingData.vwaveVesterPairAmount.gt(0) &&
      maxUnstakeableVwave &&
      maxUnstakeableVwave.lt(processedData.vwaveInStakedVwave)
    ) {
      maxAmount = maxUnstakeableVwave;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.vwaveVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("VWAVE");
    setUnstakeMethodName("unstakeVwave");
  };

  const showUnstakeEsVwaveModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake esVWAVE");
    let maxAmount = processedData.esVwaveInStakedVwave;
    if (
      processedData.esVwaveInStakedVwave &&
      vestingData &&
      vestingData.vwaveVesterPairAmount.gt(0) &&
      maxUnstakeableVwave &&
      maxUnstakeableVwave.lt(processedData.esVwaveInStakedVwave)
    ) {
      maxAmount = maxUnstakeableVwave;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.vwaveVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("esVWAVE");
    setUnstakeMethodName("unstakeEsVwave");
  };

  const renderMultiplierPointsLabel = useCallback(() => {
    return "Multiplier Points APR";
  }, []);

  const renderMultiplierPointsValue = useCallback(() => {
    return (
      <Tooltip
        handle={`100.00%`}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              Boost your rewards with Multiplier Points.&nbsp;
              <a href="https://vwaveio.gitbook.io/vwave/rewards#multiplier-points" rel="noreferrer" target="_blank">
                More info
              </a>
              .
            </>
          );
        }}
      />
    );
  }, []);

  let earnMsg;
  if (totalRewardTokensAndVlp && totalRewardTokensAndVlp.gt(0)) {
    let vwaveAmountStr;
    if (processedData.vwaveInStakedVwave && processedData.vwaveInStakedVwave.gt(0)) {
      vwaveAmountStr = formatAmount(processedData.vwaveInStakedVwave, 18, 2, true) + " VWAVE";
    }
    let esVwaveAmountStr;
    if (processedData.esVwaveInStakedVwave && processedData.esVwaveInStakedVwave.gt(0)) {
      esVwaveAmountStr = formatAmount(processedData.esVwaveInStakedVwave, 18, 2, true) + " esVWAVE";
    }
    let mpAmountStr;
    if (processedData.bonusVwaveInFeeVwave && processedData.bnVwaveInFeeVwave.gt(0)) {
      mpAmountStr = formatAmount(processedData.bnVwaveInFeeVwave, 18, 2, true) + " MP";
    }
    let vlpStr;
    if (processedData.vlpBalance && processedData.vlpBalance.gt(0)) {
      vlpStr = formatAmount(processedData.vlpBalance, 18, 2, true) + " VLP";
    }
    const amountStr = [vwaveAmountStr, esVwaveAmountStr, mpAmountStr, vlpStr].filter((s) => s).join(", ");
    earnMsg = (
      <div>
        You are earning {nativeTokenSymbol} rewards with {formatAmount(totalRewardTokensAndVlp, 18, 2, true)} tokens.
        <br />
        Tokens: {amountStr}.
      </div>
    );
  }

  return (
    <div className="default-container page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={unstakeModalReservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        library={library}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        multiplierPointsAmount={multiplierPointsAmount}
        bonusVwaveInFeeVwave={bonusVwaveInFeeVwave}
      />
      <VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        escrowedBalance={vesterDepositEscrowedBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={vesterDepositAverageStakedAmount}
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        library={library}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        library={library}
        setPendingTxns={setPendingTxns}
      />
      <CompoundModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <ClaimModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <div className="section-title-block">
        <div className="section-title-icon"></div>
        <div className="section-title-content">
          <div className="Page-title">Earn</div>
          <div className="Page-description">
            Stake{" "}
            <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noopener noreferrer">
              VWAVE
            </a>{" "}
            and{" "}
            <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
              VLP
            </a>{" "}
            to earn rewards.
          </div>
          {earnMsg && <div className="Page-description">{earnMsg}</div>}
        </div>
      </div>
      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          <div className="App-card StakeV2-vwave-card">
            <div className="App-card-title">VWAVE</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  {!vwavePrice && "..."}
                  {vwavePrice && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={"$" + formatAmount(vwavePrice, USD_DECIMALS, 2, true)}
                      renderContent={() => (
                        <>Price on Aurora: ${formatAmount(vwavePriceFromAurora, USD_DECIMALS, 2, true)}</>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "vwaveBalance", 18, 2, true)} VWAVE ($
                  {formatKeyAmount(processedData, "vwaveBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "vwaveInStakedVwave", 18, 2, true)} VWAVE ($
                  {formatKeyAmount(processedData, "vwaveInStakedVwaveUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "vwaveAprTotalWithBoost", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed VWAVE APR</span>
                            <span>{formatKeyAmount(processedData, "vwaveAprForEsVwave", 2, 2, true)}%</span>
                          </div>
                          {(!processedData.vwaveBoostAprForNativeToken ||
                            processedData.vwaveBoostAprForNativeToken.eq(0)) && (
                            <div className="Tooltip-row">
                              <span className="label">{nativeTokenSymbol} APR</span>
                              <span>{formatKeyAmount(processedData, "vwaveAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                          )}
                          {processedData.vwaveBoostAprForNativeToken &&
                            processedData.vwaveBoostAprForNativeToken.gt(0) && (
                              <div>
                                <br />
                                <div className="Tooltip-row">
                                  <span className="label">{nativeTokenSymbol} Base APR</span>
                                  <span>{formatKeyAmount(processedData, "vwaveAprForNativeToken", 2, 2, true)}%</span>
                                </div>
                                <div className="Tooltip-row">
                                  <span className="label">{nativeTokenSymbol} Boosted APR</span>
                                  <span>
                                    {formatKeyAmount(processedData, "vwaveBoostAprForNativeToken", 2, 2, true)}%
                                  </span>
                                </div>
                                <div className="Tooltip-divider" />
                                <div className="Tooltip-row">
                                  <span className="label">{nativeTokenSymbol} Total APR</span>
                                  <span>
                                    {formatKeyAmount(processedData, "vwaveAprForNativeTokenWithBoost", 2, 2, true)}%
                                  </span>
                                </div>
                                <br />
                                <div className="muted">The Boosted APR is from your staked Multiplier Points.</div>
                              </div>
                            )}
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalVwaveRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">
                              {nativeTokenSymbol} ({wrappedTokenSymbol})
                            </span>
                            <span>
                              {formatKeyAmount(processedData, "feeVwaveTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "feeVwaveTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed VWAVE</span>
                            <span>
                              {formatKeyAmount(processedData, "stakedVwaveTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "stakedVwaveTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Boost Percentage</div>
                <div>
                  <Tooltip
                    handle={`${formatAmount(processedData.boostBasisPoints, 2, 2, false)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          You are earning {formatAmount(processedData.boostBasisPoints, 2, 2, false)}% more{" "}
                          {nativeTokenSymbol} rewards using{" "}
                          {formatAmount(processedData.bnVwaveInFeeVwave, 18, 4, 2, true)} Staked Multiplier Points.
                          <br />
                          <br />
                          Use the "Compound" button to stake your Multiplier Points.
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {!totalVwaveStaked && "..."}
                  {totalVwaveStaked && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={
                        formatAmount(totalVwaveStaked, 18, 0, true) +
                        " VWAVE" +
                        ` ($${formatAmount(stakedVwaveSupplyUsd, USD_DECIMALS, 0, true)})`
                      }
                      renderContent={() => <>Aurora: {formatAmount(auroraVwaveStaked, 18, 0, true)} VWAVE</>}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                {!totalVwaveSupply && "..."}
                {totalVwaveSupply && (
                  <div>
                    {formatAmount(totalVwaveSupply, 18, 0, true)} VWAVE ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )}
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option" to="/buy_vwave">
                  Buy VWAVE
                </Link>
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showStakeVwaveModal()}>
                    Stake
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showUnstakeVwaveModal()}>
                    Unstake
                  </button>
                )}
                {active && (
                  <Link className="App-button-option App-card-option" to="/begin_account_transfer">
                    Transfer Account
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="App-card primary StakeV2-total-rewards-card">
            <div className="App-card-title">Total Rewards</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  {nativeTokenSymbol} ({wrappedTokenSymbol})
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">VWAVE</div>
                <div>
                  {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Escrowed VWAVE</div>
                <div>
                  {formatKeyAmount(processedData, "totalEsVwaveRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalEsVwaveRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Multiplier Points</div>
                <div>{formatKeyAmount(processedData, "bonusVwaveTrackerRewards", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked Multiplier Points</div>
                <div>{formatKeyAmount(processedData, "bnVwaveInFeeVwave", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Total</div>
                <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-bottom-placeholder">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && <button className="App-button-option App-card-option">Compound</button>}
                  {active && <button className="App-button-option App-card-option">Claim</button>}
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
              <div className="App-card-bottom">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && (
                    <button
                      className="App-button-option App-card-option"
                      onClick={() => setIsCompoundModalVisible(true)}
                    >
                      Compound
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => setIsClaimModalVisible(true)}>
                      Claim
                    </button>
                  )}
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">VLP ({chainName})</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>${formatKeyAmount(processedData, "vlpPrice", USD_DECIMALS, 3, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "vlpBalance", VLP_DECIMALS, 2, true)} VLP ($
                  {formatKeyAmount(processedData, "vlpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "vlpBalance", VLP_DECIMALS, 2, true)} VLP ($
                  {formatKeyAmount(processedData, "vlpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "vlpAprTotal", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">
                              {nativeTokenSymbol} ({wrappedTokenSymbol}) APR
                            </span>
                            <span>{formatKeyAmount(processedData, "vlpAprForNativeToken", 2, 2, true)}%</span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed VWAVE APR</span>
                            <span>{formatKeyAmount(processedData, "vlpAprForEsVwave", 2, 2, true)}%</span>
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalVlpRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">
                              {nativeTokenSymbol} ({wrappedTokenSymbol})
                            </span>
                            <span>
                              {formatKeyAmount(processedData, "feeVlpTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "feeVlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed VWAVE</span>
                            <span>
                              {formatKeyAmount(processedData, "stakedVlpTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "stakedVlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatKeyAmount(processedData, "vlpSupply", 18, 2, true)} VLP ($
                  {formatKeyAmount(processedData, "vlpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatKeyAmount(processedData, "vlpSupply", 18, 2, true)} VLP ($
                  {formatKeyAmount(processedData, "vlpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option" to="/buy_vlp">
                  Buy VLP
                </Link>
                <Link className="App-button-option App-card-option" to="/buy_vlp#redeem">
                  Sell VLP
                </Link>
                {hasInsurance && (
                  <a
                    className="App-button-option App-card-option"
                    href="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Purchase Insurance
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">Escrowed VWAVE</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>${formatAmount(vwavePrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "esVwaveBalance", 18, 2, true)} esVWAVE ($
                  {formatKeyAmount(processedData, "esVwaveBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "esVwaveInStakedVwave", 18, 2, true)} esVWAVE ($
                  {formatKeyAmount(processedData, "esVwaveInStakedVwaveUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "vwaveAprTotalWithBoost", 2, 2, true)}%`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <div className="Tooltip-row">
                              <span className="label">
                                {nativeTokenSymbol} ({wrappedTokenSymbol}) Base APR
                              </span>
                              <span>{formatKeyAmount(processedData, "vwaveAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                            {processedData.bnVwaveInFeeVwave && processedData.bnVwaveInFeeVwave.gt(0) && (
                              <div className="Tooltip-row">
                                <span className="label">
                                  {nativeTokenSymbol} ({wrappedTokenSymbol}) Boosted APR
                                </span>
                                <span>
                                  {formatKeyAmount(processedData, "vwaveBoostAprForNativeToken", 2, 2, true)}%
                                </span>
                              </div>
                            )}
                            <div className="Tooltip-row">
                              <span className="label">Escrowed VWAVE APR</span>
                              <span>{formatKeyAmount(processedData, "vwaveAprForEsVwave", 2, 2, true)}%</span>
                            </div>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsVwaveSupply", 18, 0, true)} esVWAVE ($
                  {formatKeyAmount(processedData, "stakedEsVwaveSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatAmount(esVwaveSupply, 18, 0, true)} esVWAVE ($
                  {formatAmount(esVwaveSupplyUsd, USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showStakeEsVwaveModal()}>
                    Stake
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showUnstakeEsVwaveModal()}>
                    Unstake
                  </button>
                )}
                {!active && (
                  <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="Tab-title-section">
          <div className="Page-title">Vest</div>
          <div className="Page-description">
            Convert esVWAVE tokens to VWAVE tokens.
            <br />
            Please read the{" "}
            <a href="https://gmxio.gitbook.io/gmx/rewards#vesting" target="_blank" rel="noopener noreferrer">
              vesting details
            </a>{" "}
            before using the vaults.
          </div>
        </div>
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-vwave-card">
              <div className="App-card-title">VWAVE Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatAmount(processedData.vwaveInStakedVwave, 18, 2, true)} VWAVE
                            <br />
                            {formatAmount(processedData.esVwaveInStakedVwave, 18, 2, true)} esVWAVE
                            <br />
                            {formatAmount(processedData.bnVwaveInFeeVwave, 18, 2, true)} Multiplier Points
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "vwaveVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(totalRewardTokens, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "vwaveVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "vwaveVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "vwaveVesterClaimSum", 18, 4, true)} tokens have been
                            converted to VWAVE from the&nbsp;
                            {formatKeyAmount(vestingData, "vwaveVesterVestedAmount", 18, 4, true)} esVWAVE deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "vwaveVesterClaimable", 18, 4, true)} VWAVE`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "vwaveVesterClaimable",
                          18,
                          4,
                          true
                        )} VWAVE tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showVwaveVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button
                      className="App-button-option App-card-option"
                      onClick={() => showVwaveVesterWithdrawModal()}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="App-card StakeV2-vwave-card">
              <div className="App-card-title">VLP Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>{formatAmount(processedData.vlpBalance, 18, 2, true)} VLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "vlpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData.vlpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "vlpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "vlpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "vlpVesterClaimSum", 18, 4, true)} tokens have been converted
                            to VWAVE from the&nbsp;
                            {formatKeyAmount(vestingData, "vlpVesterVestedAmount", 18, 4, true)} esVWAVE deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "vlpVesterClaimable", 18, 4, true)} VWAVE`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "vlpVesterClaimable",
                          18,
                          4,
                          true
                        )} VWAVE tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    ></Tooltip>
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showVlpVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showVlpVesterWithdrawModal()}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
