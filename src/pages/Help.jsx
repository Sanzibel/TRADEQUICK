import React, { useState } from 'react';
import './help.css';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function Help() {
  const [token] = useState(localStorage.getItem("token"));

  const faqs = [
    {
      title: "Account Issues",
      content: "If you're having trouble logging in or need to reset your password, visit the Settings tab in your profile or click 'Forgot Password' on the login page. Verification emails usually arrive within 5 minutes."
    },
    {
      title: "How Trading Works",
      content: "1. Browse items and click 'Trade'. 2. Select an item from your inventory to offer. 3. The Escrow bot holds items for Steam trades until the cooldown expires. 4. Roblox trades are instant. 5. Once both parties confirm, the trade executes automatically."
    },
    {
      title: "Fair Value System",
      content: "All items are tagged with an estimated market value based on recent successful trades. Our system highlights balanced offers to ensure fair trading for both parties."
    },
    {
      title: "QuickTrade Credits (QTC)",
      content: "QTC can be used to pay for escrow fees, feature your listings, or upgrade to a Premium membership. You can purchase credits in the Wallet section of your profile."
    }
  ];

  return (
    <div className="help-container">
      <TopBar token={token} />
      
      <main className="help-content">
        <h1 className="gold-glow">Help & Support Center</h1>
        <p style={{ color: 'var(--text-gray)', marginBottom: '40px' }}>Everything you need to know about trading on QuickTrade.</p>

        <div className="help-grid">
          <section className="faq-section">
            <h2 className="gold-glow">Frequently Asked Questions</h2>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                  <h3>{faq.title}</h3>
                  <p>{faq.content}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="contact-sidebar">
            <div className="contact-card">
              <h3>Still need help?</h3>
              <p>Our support team is available 24/7.</p>
              <button className="btn-gold" style={{ width: '100%', marginTop: '15px' }}>Contact Support</button>
              <button className="btn-outline-gold" style={{ width: '100%', marginTop: '10px' }}>Live Chat</button>
            </div>

            <div className="trading-tips">
              <h3 className="gold-glow">Trading Tips</h3>
              <ul>
                <li>Always check the estimated value.</li>
                <li>Never share your password.</li>
                <li>Report suspicious activity immediately.</li>
                <li>Premium members get priority support.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
