import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { FiMoreVertical, FiEdit2, FiTrash2, FiPlay, FiStopCircle, FiCopy, FiCheckCircle, FiRotateCcw } from 'react-icons/fi';

export default function Projects() {
  const {
    projects,
    addProject: contextAddProject,
    tasks,
    addTask: contextAddTask,
    sessions,
    addSession,
    stopSession,
    completeProject,
    reopenProject,
    updateProjectName,
    deleteProjectAndRelatedData,
    duplicateExistingProject,
    updateTaskTitle,
    deleteTaskAndRelatedData,
  } = useTimeTracker();

  const [projectNameInput, setProjectNameInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
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

  const editProject = useCallback((project) => {
    setEditingProjectId(project.id);
    setProjectNameInput(project.name);
    setMenuOpenId(null);
  }, []);

  const deleteProject = useCallback((projectId) => {
    if (!window.confirm('Are you sure you want to delete this project and all its tasks/sessions?')) return;
    deleteProjectAndRelatedData(projectId);
    setMenuOpenId(null);
  }, [deleteProjectAndRelatedData]);

  const duplicateProject = useCallback((project) => {
    duplicateExistingProject(project);
    setMenuOpenId(null);
  }, [duplicateExistingProject]);

  const editTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveTaskEdit = (taskId) => {
    if (!editingTaskTitle.trim()) return;
    updateTaskTitle(taskId, editingTaskTitle);
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const deleteTask = useCallback((taskId) => {
    if (!window.confirm('Delete this task and its sessions?')) return;
    deleteTaskAndRelatedData(taskId);
  }, [deleteTaskAndRelatedData]);

  const addOrUpdateProject = () => {
    if (projectNameInput.trim() === '') return;
    if (editingProjectId !== null) {
      updateProjectName(editingProjectId, projectNameInput);
      setEditingProjectId(null);
    } else {
      contextAddProject(projectNameInput);
    }
    setProjectNameInput('');
  };

  const addTaskToProject = () => {
    if (!newTaskTitle || !selectedProjectId) return;
    contextAddTask(selectedProjectId, newTaskTitle);
    setNewTaskTitle('');
    setIsTaskInputOpen(false);
  };

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

  const activeProjects = useMemo(() => projects.filter(p => !p.completed), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.completed), [projects]);

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
    <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full"> {/* MODIFIED: Removed p-6 */}
      <h1 className="text-2xl font-bold mb-6 flex-shrink-0 px-6 pt-6">Project Manager</h1> {/* MODIFIED: Added px-6 pt-6 here */}

      <div className="flex-grow overflow-y-auto p-6"> {/* MODIFIED: Added p-6 here */}
        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl mb-8 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            {editingProjectId !== null ? 'Edit Project' : 'Add New Project'}
          </h2>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Project name"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white outline-none placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={addOrUpdateProject}
              className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-sm font-medium text-white"
            >
              {editingProjectId !== null ? 'Update' : 'Add Project'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeProjects.map((project) => {
            const projectTasks = getProjectTasks(project.id);
            const isExpanded = expandedProjectIds.includes(project.id);
            return (
              <div
                key={project.id}
                className="bg-gray-100 dark:bg-[#1f1f1f] p-4 rounded-xl shadow relative transition-transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => toggleExpand(project.id)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <span className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400">{project.name}</span>
                    <span className="bg-gray-300 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full ml-2 text-gray-700 dark:text-gray-300">{projectTasks.length} tasks</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(getProjectTotalTime(project.id))} <span className="text-gray-600 dark:text-gray-500">total</span>
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
                      className="text-sm text-orange-500 dark:text-orange-400 hover:underline"
                      title="Add Task"
                    >
                      + Task
                    </button>
                    <div className="relative" ref={menuOpenId === project.id ? menuRef : null}>
                      <button
                        className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                        title="Project Options"
                      >
                        <FiMoreVertical size={20} className="text-gray-700 dark:text-gray-300" />
                      </button>
                      {menuOpenId === project.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl shadow-2xl z-50 py-2 animate-fade-in">
                          <button
                            className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-t text-gray-700 dark:text-gray-300"
                            onClick={() => editProject(project)}
                          >
                            <FiEdit2 className="mr-2 text-blue-500 dark:text-blue-400" /> Edit Project Name
                          </button>
                          <button
                            className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
                            onClick={() => duplicateProject(project)}
                          >
                            <FiCopy className="mr-2 text-green-500 dark:text-green-400" /> Duplicate Project
                          </button>
                          <button
                            className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-green-500 dark:text-green-400"
                            onClick={() => completeProject(project.id)}
                          >
                            <FiCheckCircle className="mr-2" /> Mark as Complete
                          </button>
                          <button
                            className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-red-500 dark:text-red-400 rounded-b"
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
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white outline-none placeholder-gray-500 dark:placeholder-gray-400"
                      onKeyDown={e => {
                        if (e.key === 'Enter') addTaskToProject();
                        if (e.key === 'Escape') setIsTaskInputOpen(false);
                      }}
                    />
                    <button
                      onClick={addTaskToProject}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium text-white"
                    >
                      Save Task
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <ul className="text-sm space-y-3">
                    {projectTasks.length === 0 && (
                      <li className="text-gray-600 dark:text-gray-500 italic">No tasks yet.</li>
                    )}
                    {projectTasks.map((task) => {
                      const isRunning = task.isRunning;
                      return (
                        <li key={task.id} className="bg-gray-200 dark:bg-gray-800 p-3 rounded space-y-1 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {isRunning && (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mr-2" title="Running"></span>
                            )}
                            {editingTaskId === task.id ? (
                              <input
                                type="text"
                                value={editingTaskTitle}
                                onChange={e => setEditingTaskTitle(e.target.value)}
                                className="bg-gray-300 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white flex-1 placeholder-gray-500 dark:placeholder-gray-400"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveTaskEdit(task.id);
                                  if (e.key === 'Escape') setEditingTaskId(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className={`font-medium ${isRunning ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</span>
                            )}
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {isRunning && typeof timers[task.id] === 'number'
                                ? formatTime(timers[task.id])
                                : formatTime(getTaskTotalTime(task.id))}
                            </span>
                          </div>
                          <div className="flex gap-2 items-center ml-2">
                            {editingTaskId === task.id ? (
                              <button
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-500 px-2"
                                title="Save"
                                onClick={() => saveTaskEdit(task.id)}
                              >
                                Save
                              </button>
                            ) : (
                              <>
                                <button
                                  className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-600 p-1"
                                  title="Edit Task"
                                  onClick={() => editTask(task)}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-600 p-1"
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
                              className={`ml-2 text-xs px-3 py-1 rounded flex items-center gap-1 text-white ${
                                isRunning
                                  ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                                  : 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
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

        {completedProjects.length > 0 && (
          <div className="mt-10">
            <button
              className="mb-3 text-sm text-orange-500 dark:text-orange-400 hover:underline"
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
                      className="bg-gray-200 dark:bg-[#23232b] p-4 rounded-xl shadow relative opacity-70 transition-transform hover:scale-[1.01]"
                      title="Completed Project"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => toggleExpand(project.id)}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <span className="text-lg font-semibold group-hover:text-orange-500 dark:group-hover:text-orange-400 line-through text-gray-700 dark:text-gray-400">{project.name}</span>
                          <span className="bg-gray-300 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full ml-2 text-gray-600 dark:text-gray-300">{projectTasks.length} tasks</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(getProjectTotalTime(project.id))} <span className="text-gray-600 dark:text-gray-500">total</span>
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative" ref={menuOpenId === project.id ? menuRef : null}>
                            <button
                              className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                              onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                              title="Project Options"
                            >
                              <FiMoreVertical size={20} className="text-gray-700 dark:text-gray-300" />
                            </button>
                            {menuOpenId === project.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl shadow-2xl z-50 py-2 animate-fade-in">
                                <button
                                  className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-orange-500 dark:text-orange-400"
                                  onClick={() => reopenProject(project.id)}
                                >
                                  <FiRotateCcw className="mr-2" /> Reopen Project
                                </button>
                                <button
                                  className="flex items-center w-full text-left text-sm px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-red-500 dark:text-red-400 rounded-b"
                                  onClick={() => deleteProject(project.id)}
                                >
                                  <FiTrash2 className="mr-2" /> Delete Project
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <ul className="text-sm space-y-3">
                          {projectTasks.length === 0 && (
                            <li className="text-gray-600 dark:text-gray-500 italic">No tasks yet.</li>
                          )}
                          {projectTasks.map((task) => (
                            <li key={task.id} className="bg-gray-300 dark:bg-gray-800 p-3 rounded space-y-1 flex items-center justify-between opacity-80">
                              <span className="font-medium line-through text-gray-700 dark:text-gray-400">{task.title}</span>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}