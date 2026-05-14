import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import Reports from "./pages/Reports";
import EscrowRoom from "./pages/EscrowRoom";
import TradeTickets from "./pages/TradeTickets";
import TradeTicketRoom from "./pages/TradeTicketRoom";
import Admin from "./pages/Admin";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/help" element={<Help />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/escrow/:tradeId" element={<EscrowRoom />} />
        <Route path="/tickets" element={<TradeTickets />} />
        <Route path="/ticket/:ticketCode" element={<TradeTicketRoom />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/tos" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  );
}

export default App;
