export default function Page() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center items-center px-4">
        <div className="max-w-[400px]">
          <h2 className="text-xl mb-4">yet another machine learning reading group?</h2>
          <p className="mb-2">YAMLRG is a community of machine learning researchers, engineers, and hobbyists.</p>
          <p className="mb-2">We regularly meet to share, discuss, and ideate on new work in the AI space.</p>
          <p className="mb-2">Request to join the WhatsApp group, <a className="text-blue-600 hover:text-blue-800" href="https://chat.whatsapp.com/DMqsymB8YmFD5za7R9IdwO" target="_blank" rel="noopener noreferrer">here</a>.</p>
          <p>Read more about yamlrg, <a className="text-blue-600 hover:text-blue-800" href="https://marialuquea.notion.site/YAMLRG-9613c70148514adea983217ccba6bedd?pvs=74" target="_blank" rel="noopener noreferrer">here</a>.</p>
        </div>
      </div>
      <footer className="text-xs text-center py-4">
        Created by <a className="text-blue-600 hover:text-blue-800" href="https://www.linkedin.com/in/marialuqueanguita/" target="_blank" rel="noopener noreferrer">María Luque Anguita</a> and <a className="text-blue-600 hover:text-blue-800" href="https://callum.tilbury.co.za" target="_blank" rel="noopener noreferrer">Callum Rhys Tilbury</a>.
      </footer>
    </div>
  );
}