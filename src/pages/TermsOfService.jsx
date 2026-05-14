import React from 'react';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function TermsOfService() {
  const token = localStorage.getItem("token");

  return (
    <div className="tos-container" style={{ backgroundColor: 'var(--black)', minHeight: '100vh', color: 'white' }}>
      <TopBar token={token} />
      
      <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', lineHeight: '1.6' }}>
        <h1 className="gold-glow" style={{ marginBottom: '30px' }}>Terms of Service</h1>
        
        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">1. Acceptance of Terms</h3>
          <p style={{ color: '#ccc' }}>
            By accessing and using QuickTrade, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">2. Trading & Escrow</h3>
          <p style={{ color: '#ccc' }}>
            QuickTrade provides a secure escrow service for virtual item trading. All trades must be conducted through our official AI Middleman or verified human moderators. Any attempt to bypass the escrow system is a violation of our terms and may lead to account suspension.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">3. User Responsibility</h3>
          <p style={{ color: '#ccc' }}>
            Users are responsible for verifying the details of every trade offer. QuickTrade is not liable for items lost due to user error or negligence. Ensure you are interacting with the official QuickTrade Bot in the secure Escrow Room.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">4. Prohibited Conduct</h3>
          <p style={{ color: '#ccc' }}>
            Scamming, fraudulent listings, and harassment are strictly prohibited. We reserve the right to terminate accounts that engage in deceptive practices or compromise the safety of other users.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">5. Fees</h3>
          <p style={{ color: '#ccc' }}>
            Small fees may apply for premium middleman services or specific high-value transactions. These fees are clearly displayed during the trade offer process.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
