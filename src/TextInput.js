import React from 'react';

function TextInput({ value, onChange }) {
  return (
    <div>
      <label htmlFor="textInput" className='mr-2'>Text input:</label>
      <input
        // class="form-control"
        type="text"
        id="textInput"
        value={value}
        onChange={onChange}
        placeholder="Default input"
        aria-label="default input example" 
      />
    </div>
  );
}

export default TextInput;
