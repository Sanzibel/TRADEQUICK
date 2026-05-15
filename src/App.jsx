import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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
import ProtectedRoute from "./components/ProtectedRoute";
import { notificationOptions } from "./utils/notifications.jsx";

const protect = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

function App() {
  return (
    <Router>
      <Toaster toastOptions={notificationOptions} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={protect(<Profile />)} />
        <Route path="/help" element={<Help />} />
        <Route path="/reports" element={protect(<Reports />)} />
        <Route path="/escrow/:tradeId" element={protect(<EscrowRoom />)} />
        <Route path="/tickets" element={protect(<TradeTickets />)} />
        <Route path="/ticket/:ticketCode" element={protect(<TradeTicketRoom />)} />
        <Route path="/admin" element={protect(<Admin />)} />
        <Route path="/tos" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  );
}

export default App;
