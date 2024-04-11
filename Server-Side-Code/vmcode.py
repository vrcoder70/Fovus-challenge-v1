import sys
import os
import boto3

REGION = 'us-east-2'

s3 = boto3.client('s3', region_name=REGION)
dynamodb = boto3.client('dynamodb', region_name=REGION)

def download_file_from_s3(bucket_name, object_key, local_file_path):
    try:
        s3.download_file(bucket_name, object_key, local_file_path)
        print(f"File downloaded successfully from S3 bucket '{bucket_name}'")
    except Exception as e:
        print(f"Error downloading file from S3: {e}")

def upload_file_to_s3(bucket_name, object_key, local_file_path):
    try:
        s3.upload_file(local_file_path, bucket_name, object_key)
        print(f"File uploaded successfully to S3 bucket '{bucket_name}'")
    except Exception as e:
        print(f"Error uploading file to S3: {e}")

def update_dynamodb_item(table_name, id, output_file_path):
    try:
        response = dynamodb.update_item(
            TableName=table_name,
            Key={'id': {'S': id}},
            UpdateExpression='SET output_file_path = :val',
            ExpressionAttributeValues={':val': {'S': output_file_path}}
        )

        print(f"Output file path '{output_file_path}' added to DynamoDB item '{id}'")
    except Exception as e:
        print(f"Error updating DynamoDB item: {e}")

def get_item_from_dynamodb(table, id):
    try:
        response = dynamodb.get_item(
            TableName=table,
            Key={
                'id': {'S': id}  
            }
        )

        item = response.get('Item')
        if item:
            return item
        else:
            print(f"No item found in DynamoDB table '{table}' with id '{id}'")
            return None
    except Exception as e:
        print(f"Error getting item from DynamoDB table: {e}")
        return None

def main(item_id):
    table = 'FileTable'

    item = get_item_from_dynamodb(table, item_id)

    if item:
        print("Item retrieved successfully:")
        print(item)

        input_file_path = item.get('input_file_path', {}).get('S')
        if input_file_path:
            S3_BUCKET, file_name = input_file_path.split('/')
            local_file_path = os.path.basename(file_name) 
            download_file_from_s3(S3_BUCKET, input_file_path, local_file_path)

            with open(local_file_path, 'r') as file:
                file_contents = file.read()

            input_text = item.get('input_text', {}).get('S')
            file_contents += ' : ' + input_text

            output_file_path = 'output.txt'
            with open(output_file_path, 'w') as file:
                file.write(file_contents)

            output_object_key = f'{S3_BUCKET}/output.txt'
            upload_file_to_s3(S3_BUCKET, output_object_key, output_file_path)

            update_dynamodb_item(table, item_id, output_object_key)
        else:
            print("No input_file_path found in the DynamoDB item.")


if __name__ == "__main__":
    main(sys.argv[1])
