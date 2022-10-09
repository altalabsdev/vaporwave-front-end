import React, { useCallback } from "react";
import { Link } from "react-router-dom";

import cx from "classnames";

import vwaveBigIcon from "../../img/ic_vwave_custom.svg";
import vlpBigIcon from "../../img/ic_vlp_custom.svg";

import { ARBITRUM, switchNetwork, useChainId, isHomeSite } from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import APRLabel from "../APRLabel/APRLabel";

export default function TokenCard({ showRedirectModal }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const BuyLink = ({ className, to, children, network }) => {
    if (isHome && showRedirectModal) {
      return (
        <div className={cx("a", className)} onClick={() => showRedirectModal(to)}>
          {children}
        </div>
      );
    }

    return (
      <Link to={to} className={cx(className)} onClick={() => changeNetwork(network)}>
        {children}
      </Link>
    );
  };

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={vwaveBigIcon} alt="vwaveBigIcon" /> VWAVE
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            VWAVE is the utility and governance token. Accrues 30% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            Arbitrum APR: <APRLabel chainId={ARBITRUM} label="vwaveAprTotal" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_vwave" className="default-btn" network={ARBITRUM}>
                Buy on Arbitrum
              </BuyLink>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/tokenomics"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={vlpBigIcon} alt="vlpBigIcon" /> VLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            VLP is the liquidity provider token. Accrues 70% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            Arbitrum APR: <APRLabel chainId={ARBITRUM} label="vlpAprTotal" key="ARBITRUM" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_vlp" className="default-btn" network={ARBITRUM}>
                Buy on Arbitrum
              </BuyLink>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/glp"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
