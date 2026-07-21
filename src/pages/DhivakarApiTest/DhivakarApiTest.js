import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

// Backend runs on port 8080 (see app/index.js); CRA dev server runs on 3000.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const styles = {
  section: {
    margin: '24px auto',
    padding: '20px',
    maxWidth: '720px',
    border: '1px solid #444',
    borderRadius: '8px',
    textAlign: 'left',
    color: '#fff',
    background: '#1c1c28',
  },
  row: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  input: { flex: '1 1 320px', padding: '8px', borderRadius: '4px', border: '1px solid #666' },
  button: { padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  cellLabel: { padding: '6px 10px', borderBottom: '1px solid #333', fontWeight: 600, width: '180px' },
  cellValue: { padding: '6px 10px', borderBottom: '1px solid #333', wordBreak: 'break-all' },
  error: { color: '#ff6b6b' },
};

/**
 * Simple section that calls the DhivakarApiTest backend endpoint and displays
 * the smart-contract data it returns. Defaults to USDT; any ERC-20 contract
 * address can be queried through the input field.
 */
export const DhivakarApiTest = () => {
  const [address, setAddress] = useState('');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContractInfo = useCallback(async (contractAddress) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/dhivakarApiTest`, {
        params: contractAddress ? { address: contractAddress } : {},
      });
      setInfo(res.data.data);
    } catch (err) {
      // Prefer the structured message from the API; fall back to the axios error.
      const apiMessage = err.response && err.response.data && err.response.data.message;
      setError(apiMessage || err.message || 'Failed to load contract data.');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the default contract (USDT) on first render.
  useEffect(() => {
    fetchContractInfo();
  }, [fetchContractInfo]);

  const rows = info
    ? [
        ['Token Name', info.tokenName],
        ['Token Symbol', info.tokenSymbol],
        ['Decimals', info.decimals],
        ['Total Supply', info.totalSupplyFormatted || info.totalSupplyRaw],
        ['Contract Owner', info.contractOwner || 'Not exposed by this contract'],
        ['Contract Address', info.contractAddress],
        ['Network', info.network && `${info.network.name} (chainId ${info.network.chainId})`],
      ]
    : [];

  return (
    <section style={styles.section}>
      <h2>Dhivakar Api Test — Smart Contract Data</h2>
      <p>Live ERC-20 data fetched from the backend endpoint /dhivakarApiTest.</p>

      <div style={styles.row}>
        <input
          style={styles.input}
          type="text"
          placeholder="Contract address (empty = USDT default)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button
          style={styles.button}
          onClick={() => fetchContractInfo(address.trim())}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Fetch'}
        </button>
      </div>

      {loading && <p>Reading data from the blockchain…</p>}
      {error && <p style={styles.error}>Error: {error}</p>}

      {!loading && !error && info && (
        <table style={styles.table}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td style={styles.cellLabel}>{label}</td>
                <td style={styles.cellValue}>{value === null || value === undefined ? '—' : String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default DhivakarApiTest;