import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './reports.css';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function Reports() {
  const [token] = useState(localStorage.getItem("token"));
  const [reportData, setReportData] = useState({
    tradesPerGame: [],
    itemDistribution: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get("/api/trades/reports");
      setReportData(res.data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = "Trade ID,Status,Timestamp,Offered Item,Requested Item\n";
    const rows = reportData.recentActivity.map(r => 
      `${r.trade_id},${r.status},${r.timestamp},${r.offered_item},${r.requested_item}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'quicktrade_report.csv');
    a.click();
    alert("Report exported as CSV!");
  };

  return (
    <div className="reports-container">
      <TopBar token={token} />
      
      <main className="reports-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--gold)' }}>
            <h2>Loading Analytics...</h2>
          </div>
        ) : (
          <>
            <div className="reports-header">
              <h1 className="gold-glow">Analytics & Reports</h1>
              <button className="btn-gold" onClick={exportCSV}>Export CSV</button>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="gold-glow">Trades per Game</h3>
                <div className="bar-chart-sim">
                  {reportData.tradesPerGame.length > 0 ? (
                    reportData.tradesPerGame.map(game => (
                      <div key={game.game} className="bar-row">
                        <span className="bar-label">{game.game}</span>
                        <div className="bar-container">
                          <div className="bar-fill" style={{ width: `${(game.total_trades / (Math.max(...reportData.tradesPerGame.map(g => g.total_trades)) || 1)) * 100}%` }}></div>
                        </div>
                        <span className="bar-value">{game.total_trades}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-gray)' }}>No trade data available yet.</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3 className="gold-glow">Item Distribution</h3>
                <div className="stats-list">
                  {reportData.itemDistribution.length > 0 ? (
                    reportData.itemDistribution.map(item => (
                      <div key={item.game} className="stat-item">
                        <span style={{ color: 'var(--text-gray)' }}>{item.game}</span>
                        <span className="gold-glow" style={{ fontWeight: 'bold' }}>{item.count} Items</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-gray)' }}>No items in database.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="activity-section">
              <h3 className="gold-glow" style={{ marginBottom: '20px' }}>Recent Activity Logs</h3>
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Offered</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.recentActivity.length > 0 ? (
                    reportData.recentActivity.map(activity => (
                      <tr key={activity.trade_id}>
                        <td>#{activity.trade_id}</td>
                        <td className={`status-${activity.status}`}>{activity.status}</td>
                        <td>{new Date(activity.timestamp).toLocaleString()}</td>
                        <td>{activity.offered_item}</td>
                        <td>{activity.requested_item}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No recent activity found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
