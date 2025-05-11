import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { FiMoreVertical, FiEdit2, FiTrash2, FiPlay, FiStopCircle, FiCopy, FiCheckCircle, FiRotateCcw } from 'react-icons/fi';

export default function Projects() {
  const {
    projects,
    addProject,
    tasks,
    addTask,
    sessions,
    addSession,
    stopSession,
    completeProject,
    reopenProject,
  } = useTimeTracker();

  const [projectName, setProjectName] = useState('');
  const [newTask, setNewTask] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isTaskInputOpen, setIsTaskInputOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timers, setTimers] = useState({});
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers = {};
      tasks.forEach((task) => {
        const runningSession = getTaskSessions(task.id).find((s) => !s.endTime);
        if (runningSession) {
          const start = new Date(runningSession.startTime);
          newTimers[task.id] = Math.floor((Date.now() - start.getTime()) / 1000) + getTaskTotalTime(task.id) - (runningSession.endTime ? Math.floor((new Date(runningSession.endTime) - start) / 1000) : 0);
        }
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks, sessions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  // Use useCallback for handlers
  const editProject = useCallback((project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setMenuOpenId(null);
  }, []);

  const deleteProject = useCallback((projectId) => {
    if (!window.confirm('Are you sure you want to delete this project and all its tasks/sessions?')) return;
    const updatedProjects = projects.filter(p => p.id !== projectId);
    const updatedTasks = tasks.filter(t => t.projectId !== projectId);
    const updatedTaskIds = updatedTasks.map(t => t.id);
    const updatedSessions = sessions.filter(s => updatedTaskIds.includes(s.taskId));
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
    window.location.reload();
  }, [projects, tasks, sessions]);

  const duplicateProject = (project) => {
    const newProject = { ...project, id: Date.now(), name: `${project.name} (Copy)` };
    const newTasks = tasks
      .filter(t => t.projectId === project.id)
      .map(t => ({ ...t, id: Date.now() + Math.random(), projectId: newProject.id }));
    setMenuOpenId(null);
    localStorage.setItem('projects', JSON.stringify([...projects, newProject]));
    localStorage.setItem('tasks', JSON.stringify([...tasks, ...newTasks]));
    window.location.reload();
  };

  const editTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveTaskEdit = (taskId) => {
    if (!editingTaskTitle.trim()) return;
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, title: editingTaskTitle } : t
    );
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setEditingTaskId(null);
    setEditingTaskTitle('');
    window.location.reload();
  };

  const deleteTask = (taskId) => {
    if (!window.confirm('Delete this task and its sessions?')) return;
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    const updatedSessions = sessions.filter(s => s.taskId !== taskId);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
    window.location.reload();
  };

  const addOrUpdateProject = () => {
    if (projectName.trim() === '') return;
    if (editingProjectId !== null) {
      const updatedProjects = projects.map(p =>
        p.id === editingProjectId ? { ...p, name: projectName } : p
      );
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      setEditingProjectId(null);
      setProjectName('');
      window.location.reload();
      return;
    }
    addProject(projectName);
    setProjectName('');
  };

  const addTaskToProject = () => {
    if (!newTask || !selectedProjectId) return;
    addTask(selectedProjectId, newTask);
    setNewTask('');
    setIsTaskInputOpen(false);
  };

  // Memoized helpers
  const getProjectTasks = useCallback(
    (projectId) => tasks.filter((t) => t.projectId === projectId),
    [tasks]
  );
  const getTaskSessions = useCallback(
    (taskId) => sessions.filter((s) => s.taskId === taskId),
    [sessions]
  );
  const getTaskTotalTime = useCallback(
    (taskId) =>
      getTaskSessions(taskId).reduce((total, session) => {
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : new Date();
        return total + (end - start) / 1000;
      }, 0),
    [getTaskSessions]
  );
  const getProjectTotalTime = useCallback(
    (projectId) =>
      getProjectTasks(projectId).reduce((sum, t) => sum + getTaskTotalTime(t.id), 0),
    [getProjectTasks, getTaskTotalTime]
  );

  // Memoize project lists
  const activeProjects = useMemo(() => projects.filter(p => !p.completed), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.completed), [projects]);

  // Memoize formatTime for use in lists
  const formatTime = useCallback((seconds) => {
    seconds = Number(seconds);
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, []);

  const handleStartSession = useCallback((taskId) => {
    addSession(taskId);
    setActiveTaskId(taskId);
  }, [addSession]);

  const handleStopSession = useCallback((taskId) => {
    stopSession(taskId);
    setActiveTaskId(null);
  }, [stopSession]);

  const toggleExpand = useCallback((projectId) => {
    setExpandedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Project Manager</h1>

      <div className="bg-[#1f1f1f] p-5 rounded-xl mb-8 shadow">
        <h2 className="text-lg font-semibold mb-4">
          {editingProjectId !== null ? 'Edit Project' : 'Add New Project'}
        </h2>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="flex-1 px-4 py-2 rounded bg-gray-800 text-white outline-none"
          />
          <button
            onClick={addOrUpdateProject}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-sm font-medium"
          >
            {editingProjectId !== null ? 'Update' : 'Add Project'}
          </button>
        </div>
      </div>

      {/* Active Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeProjects.map((project) => {
          const projectTasks = getProjectTasks(project.id);
          const isExpanded = expandedProjectIds.includes(project.id);
          return (
            <div
              key={project.id}
              className="bg-[#1f1f1f] p-4 rounded-xl shadow relative transition-transform hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => toggleExpand(project.id)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <span className="text-lg font-semibold group-hover:text-orange-400">{project.name}</span>
                  <span className="bg-gray-700 text-xs px-2 py-0.5 rounded-full ml-2">{projectTasks.length} tasks</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {formatTime(getProjectTotalTime(project.id))} <span className="text-gray-500">total</span>
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => {
                      setSelectedProjectId(
                        selectedProjectId === project.id ? null : project.id
                      );
                      setIsTaskInputOpen(selectedProjectId !== project.id);
                    }}
                    className="text-sm text-orange-400 hover:underline"
                    title="Add Task"
                  >
                    + Task
                  </button>
                  <div className="relative" ref={menuOpenId === project.id ? menuRef : null}>
                    <button
                      className="p-2 rounded-full hover:bg-gray-700"
                      onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                      title="Project Options"
                    >
                      <FiMoreVertical size={20} />
                    </button>
                    {menuOpenId === project.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 py-2 animate-fade-in">
                        <button
                          className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition rounded-t"
                          onClick={() => editProject(project)}
                        >
                          <FiEdit2 className="mr-2 text-blue-400" /> Edit Project Name
                        </button>
                        <button
                          className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition"
                          onClick={() => duplicateProject(project)}
                        >
                          <FiCopy className="mr-2 text-green-400" /> Duplicate Project
                        </button>
                        <button
                          className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition text-green-400"
                          onClick={() => completeProject(project.id)}
                        >
                          <FiCheckCircle className="mr-2" /> Mark as Complete
                        </button>
                        <button
                          className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition text-red-400 rounded-b"
                          onClick={() => deleteProject(project.id)}
                        >
                          <FiTrash2 className="mr-2" /> Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isTaskInputOpen && selectedProjectId === project.id && (
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') addTaskToProject();
                      if (e.key === 'Escape') setIsTaskInputOpen(false);
                    }}
                  />
                  <button
                    onClick={addTaskToProject}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
                  >
                    Save Task
                  </button>
                </div>
              )}

              {isExpanded && (
                <ul className="text-sm space-y-3">
                  {projectTasks.length === 0 && (
                    <li className="text-gray-500 italic">No tasks yet.</li>
                  )}
                  {projectTasks.map((task) => {
                    const isRunning = getTaskSessions(task.id).some((s) => !s.endTime);
                    return (
                      <li key={task.id} className="bg-gray-800 p-3 rounded space-y-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {isRunning && (
                            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2" title="Running"></span>
                          )}
                          {editingTaskId === task.id ? (
                            <input
                              type="text"
                              value={editingTaskTitle}
                              onChange={e => setEditingTaskTitle(e.target.value)}
                              className="bg-gray-700 px-2 py-1 rounded text-white flex-1"
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveTaskEdit(task.id);
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium">{task.title}</span>
                          )}
                          <span className="ml-2 text-xs text-gray-400">
                            {getTaskSessions(task.id).some((s) => !s.endTime)
                              ? formatTime(
                                  typeof timers[task.id] === 'number'
                                    ? timers[task.id]
                                    : (() => {
                                        const runningSession = getTaskSessions(task.id).find((s) => !s.endTime);
                                        if (runningSession) {
                                          const start = new Date(runningSession.startTime);
                                          return Math.floor((Date.now() - start.getTime()) / 1000);
                                        }
                                        return 0;
                                      })()
                                )
                              : formatTime(getTaskTotalTime(task.id))}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center ml-2">
                          {editingTaskId === task.id ? (
                            <button
                              className="text-green-400 hover:text-green-600 px-2"
                              title="Save"
                              onClick={() => saveTaskEdit(task.id)}
                            >
                              Save
                            </button>
                          ) : (
                            <>
                              <button
                                className="text-blue-400 hover:text-blue-600 p-1"
                                title="Edit Task"
                                onClick={() => editTask(task)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                className="text-red-400 hover:text-red-600 p-1"
                                title="Delete Task"
                                onClick={() => deleteTask(task.id)}
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              isRunning
                                ? handleStopSession(task.id)
                                : handleStartSession(task.id)
                            }
                            className={`ml-2 text-xs px-3 py-1 rounded flex items-center gap-1 ${
                              isRunning
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                            title={isRunning ? 'Stop Timer' : 'Start Timer'}
                          >
                            {isRunning ? (
                              <>
                                <FiStopCircle /> Stop
                              </>
                            ) : (
                              <>
                                <FiPlay /> Start
                              </>
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div className="mt-10">
          <button
            className="mb-3 text-sm text-orange-400 hover:underline"
            onClick={() => setShowCompleted((v) => !v)}
          >
            {showCompleted ? 'Hide' : 'Show'} Completed Projects ({completedProjects.length})
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedProjects.map((project) => {
                const projectTasks = getProjectTasks(project.id);
                const isExpanded = expandedProjectIds.includes(project.id);
                return (
                  <div
                    key={project.id}
                    className="bg-[#23232b] p-4 rounded-xl shadow relative opacity-70 transition-transform hover:scale-[1.01]"
                    title="Completed Project"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => toggleExpand(project.id)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <span className="text-lg font-semibold group-hover:text-orange-400 line-through">{project.name}</span>
                        <span className="bg-gray-700 text-xs px-2 py-0.5 rounded-full ml-2">{projectTasks.length} tasks</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {formatTime(getProjectTotalTime(project.id))} <span className="text-gray-500">total</span>
                        </span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="relative" ref={menuOpenId === project.id ? menuRef : null}>
                          <button
                            className="p-2 rounded-full hover:bg-gray-700"
                            onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                            title="Project Options"
                          >
                            <FiMoreVertical size={20} />
                          </button>
                          {menuOpenId === project.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 py-2 animate-fade-in">
                              <button
                                className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition"
                                onClick={() => reopenProject(project.id)}
                              >
                                <FiRotateCcw className="mr-2 text-orange-400" /> Reopen Project
                              </button>
                              <button
                                className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-800 transition text-red-400 rounded-b"
                                onClick={() => deleteProject(project.id)}
                              >
                                <FiTrash2 className="mr-2" /> Delete Project
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Optionally show tasks for completed projects */}
                    {isExpanded && (
                      <ul className="text-sm space-y-3">
                        {projectTasks.length === 0 && (
                          <li className="text-gray-500 italic">No tasks yet.</li>
                        )}
                        {projectTasks.map((task) => (
                          <li key={task.id} className="bg-gray-800 p-3 rounded space-y-1 flex items-center justify-between opacity-80">
                            <span className="font-medium line-through">{task.title}</span>
                            <span className="ml-2 text-xs text-gray-400">
                              {formatTime(getTaskTotalTime(task.id))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}