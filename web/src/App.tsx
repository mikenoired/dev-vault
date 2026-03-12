import "./index.css";
import Header from "./ui/landing/Header";
import Hero from "./ui/landing/Hero";

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
    </div>
  );
}

export default App;
