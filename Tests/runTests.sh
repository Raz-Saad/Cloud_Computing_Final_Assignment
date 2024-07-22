#!/bin/bash

# Fetch the API URL from CloudFormation
API_URL=$(aws cloudformation describe-stacks --stack-name SocialNetworkCdkStack  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# Export the URL as an environment variable
export API_URL

# Run the tests using npx and jest
npx jest api.test.js
