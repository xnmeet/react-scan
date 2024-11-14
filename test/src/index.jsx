import React, { useState, useMemo } from 'react';
import ReactDOMClient from 'react-dom/client';
import 'react-scan/auto';

export const App = () => {
  const [tasks, setTasks] = useState([]);

  useMemo(() => {
    // console.log('tasks', tasks);
  }, [tasks]);

  return (
    <div>
      <AddTask // render.trigger = keyof(useB)
        onCreate={(value) => {
          if (!value) return;
          setTasks([...tasks, value]);
        }}
      />
      <TaskList
        tasks={tasks}
        onDelete={(value) => setTasks(tasks.filter((task) => task !== value))}
      />
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
    <li
      style={{
        display: 'flex',
        paddingTop: '1rem',
        gap: '1rem',
      }}
    >
      {task}
      <Button onClick={() => onDelete(task)}>Delete</Button>
      {/* {Array.from({ length: 10000 }).map((_, i) => (
        <span>{i}</span>
      ))} */}
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
    <div style={{ display: 'flex', padding: '0.5rem' }}>
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
        Create
      </Button>
    </div>
  );
};

export const Input = ({ onChange, onEnter, value }) => {
  return (
    <input
      type="text"
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
