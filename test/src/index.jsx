import 'react-scan/auto';
import * as React from 'react';
import * as ReactDOMClient from 'react-dom/client';

const MyContext = React.createContext(0);

const Provider = ({ children }) => {
  const [count, setCount] = React.useState(0);
  return (
    <MyContext.Provider value={count}>
      {children}
      {/* re-renders bcos it's in the re-rendering owner tree */}
      <button
        onClick={() => setCount((count) => count + 1)}
        style={{ marginTop: 20 }}
      >
        increase
      </button>
    </MyContext.Provider>
  );
};

// re-renders bcos it consumes the context
const Count = () => {
  const count = React.useContext(MyContext);
  return <div>{count}</div>;
};

// does not re-render bcos it's not in the re-rendering
// owner tree. its owner is `App`.
const Title = () => {
  return <h1>Title</h1>;
};

const App = () => (
  <Provider>
    <Title />
    <Count />
  </Provider>
);

ReactDOMClient.createRoot(document.getElementById('root')).render(
  <>
    <App />
  </>,
);
