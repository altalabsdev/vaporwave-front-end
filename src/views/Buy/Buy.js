import React from "react";
import Footer from "../../Footer";
import "./Buy.css";
import TokenCard from "../../components/TokenCard/TokenCard";
import buyVWAVEIcon from "../../img/buy_vwave.svg";
import SEO from "../../components/Common/SEO";
import { getPageTitle } from "../../Helpers";

export default function BuyVWAVEVLP() {
  return (
    <SEO title={getPageTitle("Buy VLP or VWAVE")}>
      <div className="BuyVWAVEVLP page-layout">
        <div className="BuyVWAVEVLP-container default-container">
          <div className="section-title-block">
            <div className="section-title-icon">
              <img src={buyVWAVEIcon} alt="buyVWAVEIcon" />
            </div>
            <div className="section-title-content">
              <div className="Page-title">Buy VWAVE or VLP</div>
            </div>
          </div>
          <TokenCard />
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
