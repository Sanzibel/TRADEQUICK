import React from 'react';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  const token = localStorage.getItem("token");

  return (
    <div className="privacy-container" style={{ backgroundColor: 'var(--black)', minHeight: '100vh', color: 'white' }}>
      <TopBar token={token} />
      
      <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', lineHeight: '1.6' }}>
        <h1 className="gold-glow" style={{ marginBottom: '30px' }}>Privacy Policy</h1>
        
        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">1. Data Collection</h3>
          <p style={{ color: '#ccc' }}>
            We collect basic account information including your username, email, and trade history to provide a functional and secure trading environment.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">2. Use of Information</h3>
          <p style={{ color: '#ccc' }}>
            Your data is used to verify trades, prevent fraud, and improve the user experience. We do not sell your personal information to third parties.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">3. Secure Escrow Logs</h3>
          <p style={{ color: '#ccc' }}>
            Conversations within the Escrow Room are logged and monitored by our AI and staff to ensure trade safety and resolve disputes. These logs are stored securely.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">4. Cookies</h3>
          <p style={{ color: '#ccc' }}>
            We use cookies to keep you logged in and remember your currency preferences (e.g., Pesos, Euros).
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 className="gold-glow">5. Security</h3>
          <p style={{ color: '#ccc' }}>
            We implement industry-standard security measures to protect your account and items. However, users are encouraged to use strong, unique passwords.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
