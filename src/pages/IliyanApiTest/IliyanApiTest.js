import "./IliyanApiTest.css"
import React, { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"

// Express backend base URL. In development the CRA dev server (3000) talks to
// the backend on 8080; in production Express serves the build itself, so the
// API is same-origin and the base URL collapses to "".
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8080")

/**
 * Format a decimal string with thousands separators without converting to
 * Number, which would lose precision on large token supplies. The full
 * fraction is preserved (only trailing zeros are trimmed) so no digits
 * are dropped or rounded.
 */
const formatSupply = (value) => {
  const [whole, fraction = ""] = value.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const trimmed = fraction.replace(/0+$/, "")
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

/**
 * IliyanApiTest — technical assessment page.
 * Fetches publicly accessible smart contract data (ERC-20) from the
 * backend endpoint GET /api/iliyanApiTest and renders it in a simple
 * table. An optional address input lets the user query any contract.
 */
export const IliyanApiTest = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState("")

  // Guards against state updates landing after the user navigates away
  // while a request is still in flight
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchContractInfo = useCallback(async (contractAddress) => {
    setLoading(true)
    setError(null)
    try {
      const query = contractAddress
        ? `?address=${encodeURIComponent(contractAddress)}`
        : ""
      const res = await axios.get(`${API_BASE_URL}/api/iliyanApiTest${query}`)
      if (!mountedRef.current) return
      if (res.data && !res.data.error) {
        setData(res.data.data)
      } else {
        setError(res.data?.message || "Unexpected API response")
      }
    } catch (e) {
      if (!mountedRef.current) return
      // Prefer the structured message returned by the backend when available
      setError(e.response?.data?.message || "Failed to reach the API. Is the backend running?")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Initial load uses the backend's default contract (USDT)
  useEffect(() => {
    fetchContractInfo()
  }, [fetchContractInfo])

  const rows = data
    ? [
        ["Token Name", data.name],
        ["Token Symbol", data.symbol],
        ["Decimals", String(data.decimals)],
        ["Total Supply", `${formatSupply(data.totalSupplyFormatted)} ${data.symbol}`],
        ["Contract Owner", data.owner || "N/A (no owner() function)"],
        ["Contract Address", data.contractAddress],
        ["Network", data.network],
        ["Fetched At", data.fetchedAt],
      ]
    : []

  return (
    <div className="apiTestPage">
      <h1 className="apiTestTitle">Iliyan API Test</h1>
      <p className="apiTestSubtitle">
        Live smart contract data served by <code>GET /api/iliyanApiTest</code>
      </p>

      <div className="apiTestQuery">
        <input
          className="apiTestInput"
          type="text"
          placeholder="ERC-20 contract address (leave empty for USDT)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button
          className="apiTestButton"
          onClick={() => fetchContractInfo(address.trim())}
          disabled={loading}
        >
          Fetch
        </button>
      </div>

      {loading && <p className="apiTestStatus">Loading contract data…</p>}

      {!loading && error && (
        <div className="apiTestError">
          <p>{error}</p>
          <button className="apiTestButton" onClick={() => fetchContractInfo(address.trim())}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <table className="apiTestTable">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="apiTestLabel">{label}</td>
                <td className="apiTestValue">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default IliyanApiTest
