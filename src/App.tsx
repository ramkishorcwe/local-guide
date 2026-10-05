import { useEffect } from 'react'
import { client } from "./services/appwrite";
import { usePOIs } from "./hooks/usePOIs";
import './App.css'

function App() {
  const { pois, loading } = usePOIs();
  useEffect(() => {

    client.ping()
      .then(() => console.log("Appwrite connected successfully"))
      .catch((error) => console.error("Appwrite connection failed:", error));
  }, [])

  if (loading) return <div className="p-8 text-white">Loading Guide ...</div>;

  return (
    <div className="min-h-screen bg-navy text-white p-6">
      <h1 className="text-3xl font-bold text-gold mb-6">
        Local Guide — {pois.length} places loaded
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pois.map((poi) => (
          <div key={poi.id} className="bg-white/5 rounded-xl p-4 border border-gold/20">
            <img src={poi.imageUrl} alt={poi.name} className="rounded-lg mb-3 h-40 w-full object-cover" />
            <h2 className="font-bold text-lg">{poi.name}</h2>
            <p className="text-sm text-gray-400">{poi.area} • {poi.rating}★</p>
            {poi.partner && (
              <span className="inline-block mt-2 text-xs bg-teal/20 text-teal px-2 py-1 rounded">
                Partner • {poi.commissionPct}% commission
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App

