import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import VlpSwap from "../../components/Vlp/VlpSwap";
import buyVLPIcon from "../../img/ic_buy_vlp.svg";
import Footer from "../../Footer";
import "./BuyVlp.css";

import { useChainId } from "../../Helpers";
import { getNativeToken } from "../../data/Tokens";

export default function BuyVlp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  useEffect(() => {
    const hash = history.location.hash.replace("#", "");
    const buying = hash === "redeem" ? false : true;
    setIsBuying(buying);
  }, [history.location.hash]);

  return (
    <div className="default-container page-layout">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={buyVLPIcon} alt="buyVLPIcon" />
        </div>
        <div className="section-title-content">
          <div className="Page-title">Buy / Sell VLP</div>
          <div className="Page-description">
            Purchase{" "}
            <a href="https://gmxio.gitbook.io/gmx/vlp" target="_blank" rel="noopener noreferrer">
              VLP tokens
            </a>{" "}
            to earn {nativeTokenSymbol} fees from swaps and leverages trading.
            <br />
            Note that there is a minimum holding time of 15 minutes after a purchase.
            <br />
            View <Link to="/earn">staking</Link> page.
          </div>
        </div>
      </div>
      <VlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
