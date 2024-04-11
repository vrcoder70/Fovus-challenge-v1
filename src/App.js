import './App.css';
import React, { useState, useEffect  } from 'react';
import TextInput from './TextInput';
import FileInput from './FileInput';
import SubmitButton from './SubmitButton';
import AWS from 'aws-sdk';
import {nanoid} from 'nanoid';

function App() {
  const S3_BUCKET = "fovusclgbucket";
  const REGION = "us-east-2";

  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [textValue, setTextValue] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://wx43jy9kh1.execute-api.us-east-2.amazonaws.com/v2');
        const data = await response.json();
        return JSON.parse(data.body);
        
      } catch (error) {
        console.error('Error fetching AWS credentials:', error);
      }
    };
  
    const fetchDataAndUpdateState = async () => {
      const body = await fetchData();
      setAccessKeyId(body.accessKeyId);
      setSecretAccessKey(body.secretAccessKey);
    };
  
    fetchDataAndUpdateState(); 
  }, []);

  const handleTextChange = (e) => {
    setTextValue(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleSubmit = () => {
    console.log('Text:', textValue);
    console.log('File:', file);
    
    uploadFile();
    uploadDataInDynamoDB();
  };

  const uploadDataInDynamoDB = async () => {
    // Call API Gateway endpoint
    try {
      const id = nanoid();
      const response = await fetch('https://wx43jy9kh1.execute-api.us-east-2.amazonaws.com/v2', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id : id,
            textValue: textValue,
            filePath: S3_BUCKET +'/'+ file.name, 
          }),
      });

      if (response.ok) {
          const data = await response.json();
          console.log('Response from API:', data);
      } else {
          console.error('Error:', response.statusText);
      }
    } catch (error) {
      console.error('Error calling API:', error);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });

    const s3 = new AWS.S3({
      params: { Bucket: S3_BUCKET },
      region: REGION,
    });

    const params = {
      Bucket: S3_BUCKET,
      Key: S3_BUCKET + '/' +file.name,
      Body: file,
    };

    try {
      const data = await s3.upload(params).promise();
      
      alert("File uploaded successfully.");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again later.");
    }
  };

  return (
    <div className="App">
    <div className="flex justify-center items-center h-screen">
      <div className="w-1/2">
        <h1 className="text-center mb-4">Fovus Code Challenge</h1>
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <TextInput value={textValue} onChange={handleTextChange} className="mr-2" />
          </div>
          <div className="flex items-center mb-2">
            <FileInput onChange={handleFileChange} className="mr-2" />
          </div>
        </div>
        <SubmitButton onClick={handleSubmit} />
      </div>
    </div>
  </div>
  
  );
  
}

export default App;
