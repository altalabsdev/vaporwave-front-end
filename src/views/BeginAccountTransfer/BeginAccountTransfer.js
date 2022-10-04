import React, { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";

import { getContract } from "../../Addresses";
import { callContract } from "../../Api";

import Modal from "../../components/Modal/Modal";
import Footer from "../../Footer";

import Token from "../../abis/Token.json";
import Vester from "../../abis/Vester.json";
import RewardTracker from "../../abis/RewardTracker.json";
import RewardRouter from "../../abis/RewardRouter.json";

import { FaCheck, FaTimes } from "react-icons/fa";

import { fetcher, approveTokens, useChainId } from "../../Helpers";

import "./BeginAccountTransfer.css";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FaCheck className="ValidationRow-icon" />}
        {!isValid && <FaTimes className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer(props) {
  const { setPendingTxns } = props;
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  let parsedReceiver = ethers.constants.AddressZero;
  if (ethers.utils.isAddress(receiver)) {
    parsedReceiver = receiver;
  }

  const vwaveAddress = getContract(chainId, "VWAVE");
  const vwaveVesterAddress = getContract(chainId, "VwaveVester");
  const vlpVesterAddress = getContract(chainId, "VlpVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: vwaveVesterBalance } = useSWR([active, chainId, vwaveVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const { data: vlpVesterBalance } = useSWR([active, chainId, vlpVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const stakedVwaveTrackerAddress = getContract(chainId, "StakedVwaveTracker");
  const { data: cumulativeVwaveRewards } = useSWR(
    [active, chainId, stakedVwaveTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const stakedVlpTrackerAddress = getContract(chainId, "StakedVlpTracker");
  const { data: cumulativeVlpRewards } = useSWR(
    [active, chainId, stakedVlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const { data: transferredCumulativeVwaveRewards } = useSWR(
    [active, chainId, vwaveVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: transferredCumulativeVlpRewards } = useSWR(
    [active, chainId, vlpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR([active, chainId, rewardRouterAddress, "pendingReceivers", account], {
    fetcher: fetcher(library, RewardRouter),
  });

  const { data: vwaveAllowance } = useSWR(
    [active, chainId, vwaveAddress, "allowance", account, stakedVwaveTrackerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const { data: vwaveStaked } = useSWR(
    [active, chainId, stakedVwaveTrackerAddress, "depositBalances", account, vwaveAddress],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const needApproval = vwaveAllowance && vwaveStaked && vwaveStaked.gt(vwaveAllowance);

  const hasVestedVwave = vwaveVesterBalance && vwaveVesterBalance.gt(0);
  const hasVestedVlp = vlpVesterBalance && vlpVesterBalance.gt(0);
  const hasStakedVwave =
    (cumulativeVwaveRewards && cumulativeVwaveRewards.gt(0)) ||
    (transferredCumulativeVwaveRewards && transferredCumulativeVwaveRewards.gt(0));
  const hasStakedVlp =
    (cumulativeVlpRewards && cumulativeVlpRewards.gt(0)) ||
    (transferredCumulativeVlpRewards && transferredCumulativeVlpRewards.gt(0));
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.constants.AddressZero;

  const getError = () => {
    if (!account) {
      return "Wallet is not connected";
    }
    if (hasVestedVwave) {
      return "Vested VWAVE not withdrawn";
    }
    if (hasVestedVlp) {
      return "Vested VLP not withdrawn";
    }
    if (!receiver || receiver.length === 0) {
      return "Enter Receiver Address";
    }
    if (!ethers.utils.isAddress(receiver)) {
      return "Invalid Receiver Address";
    }
    if (hasStakedVwave || hasStakedVlp) {
      return "Invalid Receiver";
    }
    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return "Self-transfer not supported";
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return "Transfer already initiated";
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isTransferring) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (needApproval) {
      return "Approve VWAVE";
    }
    if (isApproving) {
      return "Approving...";
    }
    if (isTransferring) {
      return "Transferring";
    }

    return "Begin Transfer";
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

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: "Transfer submitted!",
      failMsg: "Transfer failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
  };

  const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
  const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

  return (
    <div className="BeginAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label="Transfer Submitted"
      >
        Your transfer has been initiated.
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          Continue
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">Transfer Account</div>
        <div className="Page-description">
          Please only use this for full account transfers.
          <br />
          This will transfer all your VWAVE, esVWAVE, VLP and Multiplier Points to your new account.
          <br />
          Transfers are only supported if the receiving account has not staked VWAVE or VLP tokens before.
          <br />
          Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
          </div>
        )}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">Receiver Address</label>
            <div>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="text-input"
              />
            </div>
          </div>
          <div className="BeginAccountTransfer-validations">
            <ValidationRow isValid={!hasVestedVwave}>
              Sender has withdrawn all tokens from VWAVE Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasVestedVlp}>
              Sender has withdrawn all tokens from VLP Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasStakedVwave}>Receiver has not staked VWAVE tokens before</ValidationRow>
            <ValidationRow isValid={!hasStakedVlp}>Receiver has not staked VLP tokens before</ValidationRow>
          </div>
          <div className="input-row">
            <button
              className="App-cta Exchange-swap-button"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
