import "./WalletDashboard.css"

import React, { useCallback, useContext, useEffect, useState } from "react"

import { useNavigate } from "react-router-dom"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

import { faChevronRight } from "@fortawesome/free-solid-svg-icons"



import logoImg from "../../assets/img/nitrogem.png"

import heroBg from "../../assets/img/signalra-hero.png"

import { AppContext } from "../../context"

import { connectWithProvider } from "../../helpers/wallet"

import { describeInjectedWallets } from "../../helpers/injectedWallets"

import { NotificationManager } from "react-notifications"

import WalletBrandIcon from "../../components/WalletBrandIcon/WalletBrandIcon"



const INSTALL_WALLETS = [

  { name: "MetaMask", href: "https://metamask.io/download/" },

  { name: "Rabby", href: "https://rabby.io/" },

  { name: "Phantom", href: "https://phantom.app/download" },

]



export const WalletDashboard = () => {

  const navigate = useNavigate()

  const { handleWalletAddress } = useContext(AppContext)

  const [wallets, setWallets] = useState([])

  const [connectingName, setConnectingName] = useState("")



  const refreshWallets = useCallback(() => {

    setWallets(describeInjectedWallets())

  }, [])



  useEffect(() => {

    refreshWallets()

    const onFocus = () => refreshWallets()

    window.addEventListener("focus", onFocus)

    return () => window.removeEventListener("focus", onFocus)

  }, [refreshWallets])



  const onPickWallet = async (provider, name) => {

    setConnectingName(name)

    try {

      const res = await connectWithProvider(provider)

      handleWalletAddress(res.address)

      if (!res.address) {

        NotificationManager.warning(res.status || "Could not connect wallet.")

      } else {

        NotificationManager.success(`Connected with ${name}`)

        navigate("/home", { replace: true })

      }

    } catch (e) {

      NotificationManager.error(e?.message || "Connection error")

    } finally {

      setConnectingName("")

    }

  }



  return (

    <div className="walletDashboardPage">

      <div
        className="walletDashboardBg"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />

      <div className="walletDashboardInner">

        <div className="walletDashboardPanel">

          <div className="walletDashboardPanelGlow" aria-hidden="true" />



          <div className="walletDashboardPanelHeader">

            <div className="walletDashboardTitleIcon">

              <img src={logoImg} alt="Signalra" />

            </div>

            <h2 className="walletDashboardPanelTitle">Signalra</h2>

            <p className="walletDashboardPanelLead">

              Connect your wallet to discover, vote on, and promote tokens.

            </p>

          </div>



          <div className="walletDashboardDivider" />



          {wallets.length > 0 ? (

            <>

              <p className="walletDashboardSectionLabel">Select wallet</p>

              <div className="walletDashboardOptionGrid">

                {wallets.map(({ provider, name }, idx) => (

                  <button

                    key={idx}

                    type="button"

                    className="walletDashboardOptionBtn"

                    disabled={Boolean(connectingName)}

                    onClick={() => onPickWallet(provider, name)}

                  >

                    <WalletBrandIcon name={name} />

                    <span className="walletDashboardOptionText">

                      <span className="walletDashboardOptionName">

                        {connectingName === name ? "Connecting…" : name}

                      </span>

                      <span className="walletDashboardOptionHint">

                        {connectingName === name ? "Approve in your wallet" : "Click to connect"}

                      </span>

                    </span>

                    <FontAwesomeIcon icon={faChevronRight} className="walletDashboardOptionArrow" />

                  </button>

                ))}

              </div>

            </>

          ) : (

            <>

              <p className="walletDashboardSectionLabel">Install a wallet</p>

              <p className="walletDashboardHint">

                No Ethereum wallet detected. Install one below, then refresh this page.

              </p>

              <div className="walletDashboardOptionGrid">

                {INSTALL_WALLETS.map(({ name, href }) => (

                  <a

                    key={name}

                    className="walletDashboardOptionBtn walletDashboardInstallBtn"

                    href={href}

                    target="_blank"

                    rel="noopener noreferrer"

                  >

                    <WalletBrandIcon name={name} />

                    <span className="walletDashboardOptionText">

                      <span className="walletDashboardOptionName">Get {name}</span>

                      <span className="walletDashboardOptionHint">Install extension</span>

                    </span>

                    <FontAwesomeIcon icon={faChevronRight} className="walletDashboardOptionArrow" />

                  </a>

                ))}

              </div>

            </>

          )}



          <div className="walletDashboardPanelFooter">

            <span>Discover · Vote · Promote</span>

          </div>

        </div>

      </div>

    </div>

  )

}



export default WalletDashboard

