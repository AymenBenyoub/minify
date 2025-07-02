import {Theme , Button} from "@radix-ui/themes"
function App() {
  

  return (
    <Theme>
      <div style={{ padding: '20px' }}>
        <h1>Welcome to Radix UI Themes</h1>
        <p>This is a simple example of using Radix UI Themes.</p>
        <Button variant="solid">Click Me</Button>
      </div>
   </Theme>
  )
}

export default App
