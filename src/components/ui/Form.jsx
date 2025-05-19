import React from 'react';
import PropTypes from 'prop-types';

const Form = ({ onSubmit, children, className }) => {
  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 ${className}`}
    >
      {children}
      <button
        type="submit"
        className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  );
};

Form.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

Form.defaultProps = {
  className: '',
};

export default Form;