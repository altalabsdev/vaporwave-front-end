import React from "react";

import useSWR from "swr";

import {
  PLACEHOLDER_ACCOUNT,
  getServerUrl,
  fetcher,
  formatKeyAmount,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
} from "../../Helpers";

import Vault from "../../abis/Vault.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import RewardReader from "../../abis/RewardReader.json";
import Token from "../../abis/Token.json";
import VlpManager from "../../abis/VlpManager.json";

import { useWeb3React } from "@web3-react/core";

import { useVwavePrice } from "../../Api";

import { getContract } from "../../Addresses";

export default function APRLabel({ chainId, label }) {
  let { active } = useWeb3React();

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

  const vwaveVesterAddress = getContract(chainId, "VwaveVester");
  const vlpVesterAddress = getContract(chainId, "VlpVester");

  const vesterAddresses = [vwaveVesterAddress, vlpVesterAddress];

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
    [`StakeV2:walletBalances:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [`StakeV2:depositBalances:${active}`, chainId, rewardReaderAddress, "getDepositBalances", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedVwaveSupply } = useSWR(
    [`StakeV2:stakedVwaveSupply:${active}`, chainId, vwaveAddress, "balanceOf", stakedVwaveTrackerAddress],
    {
      fetcher: fetcher(undefined, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, vlpManagerAddress, "getAums"], {
    fetcher: fetcher(undefined, VlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: fetcher(undefined, Vault),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, ReaderV2, [vesterAddresses]),
    }
  );

  const { vwavePrice } = useVwavePrice(chainId, {}, active);

  const vwaveSupplyUrl = getServerUrl(chainId, "/gmx_supply");
  const { data: vwaveSupply } = useSWR([vwaveSupplyUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

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

  return <>{`${formatKeyAmount(processedData, label, 2, 2, true)}%`}</>;
}
