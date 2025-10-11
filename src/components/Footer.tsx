import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/store" className="hover:text-primary">Browse Store</Link></li>
              <li><Link to="/library" className="hover:text-primary">My Library</Link></li>
              <li><Link to="/orders" className="hover:text-primary">Order History</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/policies/shipping" className="hover:text-primary">Shipping</Link></li>
              <li><Link to="/policies/refunds" className="hover:text-primary">Refunds</Link></li>
              <li><a href="mailto:support@vibecheck.app" className="hover:text-primary">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link to="/community-guidelines" className="hover:text-primary">Community Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/inclusion" className="hover:text-primary">Inclusion & Respect</Link></li>
              <li><Link to="/crisis" className="hover:text-primary">Crisis Resources</Link></li>
            </ul>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>🔒 Secure Checkout</p>
              <p className="text-xs">Card statement: VIBE CHECK APP</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground space-y-2">
          <p>🏳️‍🌈 Inclusive by design. Everyone belongs here. 🏳️‍⚧️</p>
          <p>&copy; 2025 Vibe Check. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};