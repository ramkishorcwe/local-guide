import { useEffect } from 'react'
import { client } from "./services/appwrite";
import './App.css'

function App() {

  useEffect(() => {

    client.ping()
      .then(() => console.log("Appwrite connected successfully"))
      .catch((error) => console.error("Appwrite connection failed:", error));
  }, [])

  return (
    <>
      <section id="center" className='bg-red-300'>
        Local Guide
      </section>

    </>
  )
}

export default App
