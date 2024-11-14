import { scan } from 'react-scan/dist/index.mjs'; // force production build
import React, { useState } from 'react';
import ReactDOMClient from 'react-dom/client';
import './styles.css';

scan({
  enabled: true,
  log: true,
  clearLog: true,
  production: true,
});

export const App = () => {
  const [tasks, setTasks] = useState([]);

  return (
    <div className="app-container">
      <div className="main-content">
        <nav className="navbar">
          <a href="/" className="navbar-brand">
            <img src="/logo.svg" alt="react-scan-logo" width="30" height="30" />
            <h3>
              <strong>React Scan</strong>
            </h3>
          </a>
          <div className="navbar-links">
            <a
              href="https://github.com/aidenybai/react-scan#readme"
              className="navbar-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              install
            </a>
            <a
              href="https://github.com/aidenybai/react-scan"
              className="navbar-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
          </div>
        </nav>

        <p>
          React Scan "scans" your React app for problematic renders. It's just
          JavaScript, so you drop it in anywhere – script tag, npm, you name it!
        </p>

        <div className="task-section">
          <p>Try interacting with this input to see it in action:</p>
          <AddTask
            onCreate={(value) => {
              if (!value) return;
              setTasks([...tasks, value]);
            }}
          />
          <TaskList
            tasks={tasks}
            onDelete={(value) =>
              setTasks(tasks.filter((task) => task !== value))
            }
          />
        </div>
      </div>

      <div className="sticky-footer">
        <p>Get started by adding this script to your app:</p>
        <p>
          <code>
            &lt;script
            src=&quot;https://unpkg.com/react-scan/dist/auto.global.js&quot;&gt;&lt;/script&gt;
          </code>
        </p>
        <p>
          <small>
            <strong>Important:</strong> Add this before any other scripts run!
          </small>
        </p>
        <a
          href="https://github.com/aidenybai/react-scan#readme"
          className="cta-button"
        >
          View source →
        </a>
        <p>
          <small>
            Psst... need something more advanced? Check out:{' '}
            <a href="https://million.dev" className="navbar-link">
              Million Lint
            </a>
          </small>
        </p>
      </div>
    </div>
  );
};

export const TaskList = ({ tasks, onDelete }) => {
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task} task={task} onDelete={onDelete} />
      ))}
    </ul>
  );
};

export const TaskItem = ({ task, onDelete }) => {
  return (
    <li className="task-item">
      {task}
      <Button onClick={() => onDelete(task)}>Delete</Button>
    </li>
  );
};

export const Text = ({ children }) => {
  return <span>{children}</span>;
};

export const Button = ({ onClick, children }) => {
  return (
    <button onClick={onClick}>
      <Text>{children}</Text>
    </button>
  );
};

export const AddTask = ({ onCreate }) => {
  const [value, setValue] = useState('');
  const [id, setId] = useState(0);
  return (
    <div className="add-task-container">
      <Input
        onChange={(value) => setValue(value)}
        onEnter={(value) => {
          onCreate(`${value} (${id})`);
          setValue('');
          setId(id + 1);
        }}
        value={value}
      />
      <Button
        onClick={() => {
          onCreate(value);
          setValue('');
        }}
      >
        Add Task
      </Button>
    </div>
  );
};

export const Input = ({ onChange, onEnter, value }) => {
  return (
    <input
      type="text"
      className="input"
      placeholder="Today I will..."
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onEnter(e.target.value);
        }
      }}
      value={value}
    />
  );
};

ReactDOMClient.createRoot(document.getElementById('root')).render(<App />);
