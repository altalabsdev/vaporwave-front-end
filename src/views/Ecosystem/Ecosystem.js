import React from "react";
import SEO from "../../components/Common/SEO";

import Footer from "../../Footer";
import { getPageTitle, AURORA } from "../../Helpers";

import auroraIcon from "../../img/ic_aurora_16.svg";

import "./Ecosystem.css";

const NETWORK_ICONS = {
  [AURORA]: auroraIcon,
};

const NETWORK_ICON_ALTS = {
  [AURORA]: "Aurora Icon",
};
// TODO: replace ecosystem links with VWAVE links
export default function Ecosystem() {
  const vwavePages = [
    // {
    //   title: "VWAVE Governance",
    //   link: "https://gov.vaporwave.farm/",
    //   about: "VWAVE Governance Page",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Stats",
    //   link: "https://stats.vaporwave.farm/",
    //   about: "VWAVE Stats Page",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Proposals",
    //   link: "https://snapshot.org/#/gmx.eth",
    //   about: "VWAVE Proposals Voting page",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Announcements",
    //   link: "https://t.me/GMX_Announcements",
    //   about: "VWAVE Announcements and Updates",
    //   chainIds: [AURORA],
    // },
  ];

  const communityProjects = [
    // {
    //   title: "VWAVE Blueberry Club",
    //   link: "https://www.blueberry.club/",
    //   about: "VWAVE Blueberry NFTs",
    //   creatorLabel: "@xm92boi",
    //   creatorLink: "https://t.me/xm92boi",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Leaderboard",
    //   link: "https://www.gmx.house/",
    //   about: "Leaderboard for VWAVE traders",
    //   creatorLabel: "@Itburnz",
    //   creatorLink: "https://t.me/Itburnz",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Positions Bot",
    //   link: "https://t.me/GMXPositions",
    //   about: "Telegram bot for VWAVE position updates",
    //   creatorLabel: "@zhongfu",
    //   creatorLink: "https://t.me/zhongfu",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Blueberry Pulse",
    //   link: "https://blueberrypulse.substack.com/",
    //   about: "VWAVE Weekly Updates",
    //   creatorLabel: "@puroscohiba",
    //   creatorLink: "https://t.me/puroscohiba",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "DegenClip",
    //   link: "https://degenclip.com/gmx",
    //   about: "Community curated tweet collection",
    //   creatorLabel: "@ox21l",
    //   creatorLink: "https://t.me/ox21l",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Yield Simulator",
    //   link: "https://gmx.defisims.com/",
    //   about: "Yield simulator for VWAVE",
    //   creatorLabel: "@s0berknight",
    //   creatorLink: "https://twitter.com/s0berknight",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Returns Calculator",
    //   link: "https://docs.google.com/spreadsheets/u/4/d/1mQZlztz_NpTg5qQiYIzc_Ls1OTLfMOUtmEQN-WW8jj4/copy",
    //   linkLabel: "Google Spreadsheet",
    //   about: "Returns calculator for VWAVE and VLP",
    //   creatorLabel: "@AStoicTrader1",
    //   creatorLink: "https://twitter.com/AStoicTrader1",
    //   chainIds: [AURORA],
    // },
  ];

  const dashboardProjects = [
    // {
    //   title: "VWAVE Referrals Dashboard",
    //   link: "https://www.gmxreferrals.com/",
    //   about: "Dashboard for VWAVE referral stats",
    //   creatorLabel: "@s0berknight",
    //   creatorLink: "https://twitter.com/s0berknight",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Terminal",
    //   link: "https://gmxterminal.com",
    //   about: "VWAVE explorer for stats and traders",
    //   creatorLabel: "@vipineth",
    //   creatorLink: "https://t.me/vipineth",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "VWAVE Analytics",
    //   link: "https://www.gmxstats.com/",
    //   about: "Financial reports and protocol analytics",
    //   creatorLabel: "@CryptoMessiah",
    //   creatorLink: "https://t.me/LarpCapital",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "TokenTerminal",
    //   link: "https://tokenterminal.com/terminal/projects/gmx",
    //   about: "VWAVE fundamentals",
    //   creatorLabel: "@tokenterminal",
    //   creatorLink: "https://twitter.com/tokenterminal",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "CryptoFees",
    //   link: "https://cryptofees.info",
    //   about: "Fees generated by VWAVE",
    //   creatorLabel: "@CryptoFeesInfo",
    //   creatorLink: "https://twitter.com/CryptoFeesInfo",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Shogun Dashboard (Dune Aurora)",
    //   link: "https://dune.com/shogun/gmx-analytics-aurora",
    //   about: "Protocol analytics",
    //   creatorLabel: "@JamesCliffyz",
    //   creatorLink: "https://twitter.com/JamesCliffyz",
    //   chainIds: [AURORA],
    // },
  ];

  const integrations = [
    // {
    //   title: "DeBank",
    //   link: "https://debank.com/",
    //   about: "DeFi Portfolio Tracker",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1439711532884152324",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Defi Llama",
    //   link: "https://defillama.com",
    //   about: "Decentralized Finance Dashboard",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1438124768033660938",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Dopex",
    //   link: "https://dopex.io",
    //   about: "Decentralized Options Protocol",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1482445801523716099",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Rook",
    //   link: "https://www.rook.fi/",
    //   about: "MEV Optimizer",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/Rook/status/1509613786600116251",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Jones DAO",
    //   link: "https://jonesdao.io",
    //   about: "Decentralized Options Strategies",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1482788805635678212",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Vovo Finance",
    //   link: "https://vovo.finance/",
    //   about: "Structured Products",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/VovoFinance/status/1531517177790345217",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Stabilize Protocol",
    //   link: "https://www.stabilize.finance/",
    //   about: "Yield Vaults",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/StabilizePro/status/1532348674986082306",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "DODO",
    //   link: "https://dodoex.io/",
    //   about: "Decentralized Trading Protocol",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1438899138549145605",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Open Ocean",
    //   link: "https://openocean.finance/",
    //   about: "DEX Aggregator",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/GMX_IO/status/1495780826016989191",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "Paraswap",
    //   link: "https://www.paraswap.io/",
    //   about: "DEX Aggregator",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/paraswap/status/1546869879336222728",
    //   chainIds: [AURORA],
    // },
    // {
    //   title: "1inch",
    //   link: "https://1inch.io/",
    //   about: "DEX Aggregator",
    //   announcementLabel: "https://twitter.com",
    //   announcementLink: "https://twitter.com/VGMX_IO/status/1522247451410845696",
    //   chainIds: [AURORA],
    // },
  ];

  const telegramGroups = [
    // {
    //   title: "VWAVE",
    //   link: "https://t.me/GMX_IO",
    //   about: "Telegram Group",
    // },
    // {
    //   title: "VWAVE (Chinese)",
    //   link: "https://t.me/gmxch",
    //   about: "Telegram Group (Chinese)",
    // },
    // {
    //   title: "VWAVE (Portuguese)",
    //   link: "https://t.me/GMX_Portuguese",
    //   about: "Telegram Group (Portuguese)",
    // },
    // {
    //   title: "VWAVE Trading Chat",
    //   link: "https://t.me/gambittradingchat",
    //   about: "VWAVE community discussion",
    // },
  ];

  return (
    <SEO title={getPageTitle("Ecosystem Projects")}>
      <div className="default-container page-layout">
        <div>
          <div className="section-title-block">
            <div className="section-title-icon"></div>
            <div className="section-title-content">
              <div className="Page-title">VWAVE Pages</div>
              <div className="Page-description">VWAVE ecosystem pages.</div>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {vwavePages.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Link</div>
                      <div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {linkLabel}
                        </a>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">About</div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Community Projects</div>
            <div className="Page-description">Projects developed by the VWAVE community.</div>
          </div>
          <div className="DashboardV2-projects">
            {communityProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Link</div>
                      <div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {linkLabel}
                        </a>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">About</div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Creator</div>
                      <div>
                        <a href={item.creatorLink} target="_blank" rel="noopener noreferrer">
                          {item.creatorLabel}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Dashboards</div>
            <div className="Page-description">VWAVE dashboards and analytics.</div>
          </div>
          <div className="DashboardV2-projects">
            {dashboardProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>

                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Link</div>
                      <div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {linkLabel}
                        </a>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">About</div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Creator</div>
                      <div>
                        <a href={item.creatorLink} target="_blank" rel="noopener noreferrer">
                          {item.creatorLabel}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Partnerships and Integrations</div>
            <div className="Page-description">Projects integrated with VWAVE.</div>
          </div>
          <div className="DashboardV2-projects">
            {integrations.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div key={item.title} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Link</div>
                      <div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {linkLabel}
                        </a>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">About</div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Announcement</div>
                      <div>
                        <a href={item.announcementLink} target="_blank" rel="noopener noreferrer">
                          {item.announcementLabel}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Telegram Groups</div>
            <div className="Page-description">Community-led Telegram groups.</div>
          </div>
          <div className="DashboardV2-projects">
            {telegramGroups.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">{item.title}</div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Link</div>
                      <div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {linkLabel}
                        </a>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">About</div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
