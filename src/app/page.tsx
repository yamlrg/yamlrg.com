export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-[400px] mx-auto">
        <h2 className="text-xl mb-4">yet another machine learning reading group?</h2>
        <p className="mb-2">YAMLRG is a community of machine learning researchers, engineers, and hobbyists.</p>
        <p className="mb-2">We regularly meet to share, discuss, and ideate on new work in the AI space.</p>
        <p className="mb-2">Request to join us, <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" href="https://chat.whatsapp.com/DMqsymB8YmFD5za7R9IdwO" target="_blank" rel="noopener noreferrer">here</a>.</p>
        <p className="mb-2">Read more about yamlrg, <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" href="https://marialuquea.notion.site/YAMLRG-9613c70148514adea983217ccba6bedd?pvs=74" target="_blank" rel="noopener noreferrer">here</a>.</p>
        <p className="mb-2">Check out our <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" href="/wrapped">2024 Wrapped</a> 🎁</p>
      </div>
      <footer className="text-xs text-center mb-8">
        Created by <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" href="https://www.linkedin.com/in/marialuqueanguita/" target="_blank" rel="noopener noreferrer">María Luque Anguita</a> and <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" href="https://callum.tilbury.co.za" target="_blank" rel="noopener noreferrer">Callum Rhys Tilbury</a>.
      </footer>
    </main>
  )
}