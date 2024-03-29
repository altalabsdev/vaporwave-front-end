import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import "./AssetDropdown.css";
import coingeckoIcon from "../../img/ic_coingecko_16.svg";
import auroraIcon from "../../img/ic_aurora_16.svg";
import metamaskIcon from "../../img/ic_metamask_16.svg";
import { addTokenToMetamask, ICONLINKS, platformTokens, useChainId } from "../../Helpers";
import { useWeb3React } from "@web3-react/core";

function AssetDropdown({ assetSymbol, assetInfo }) {
  const { active } = useWeb3React();
  const { chainId } = useChainId();
  let { coingecko, aurora } = ICONLINKS[chainId][assetSymbol];
  const unavailableTokenSymbols = {
    1313161554: ["ETH"],
  };

  return (
    <Menu>
      <Menu.Button as="div" className="dropdown-arrow center-both">
        <FiChevronDown size={20} />
      </Menu.Button>
      <Menu.Items as="div" className="asset-menu-items">
        <Menu.Item>
          <>
            {coingecko && (
              <a href={coingecko} className="asset-item" target="_blank" rel="noopener noreferrer">
                <img src={coingeckoIcon} alt="Open in Coingecko" />
                <p>Open in Coingecko</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {aurora && (
              <a href={aurora} className="asset-item" target="_blank" rel="noopener noreferrer">
                <img src={auroraIcon} alt="Open in explorer" />
                <p>Open in Explorer</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {active && unavailableTokenSymbols[chainId].indexOf(assetSymbol) < 0 && (
              <div
                onClick={() => {
                  let token = assetInfo
                    ? { ...assetInfo, image: assetInfo.imageUrl }
                    : platformTokens[chainId][assetSymbol];
                  addTokenToMetamask(token);
                }}
                className="asset-item"
              >
                <img src={metamaskIcon} alt="Add to Metamask" />
                <p>Add to Metamask</p>
              </div>
            )}
          </>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default AssetDropdown;
