import React from 'react';

function FileInput({ onChange }) {
  return (
    <div>
      <label htmlFor="fileInput" className='mr-2'>File input: </label>
      <input
        type="file"
        id="fileInput"
        onChange={onChange}
      />
    </div>
  );
}

export default FileInput;
