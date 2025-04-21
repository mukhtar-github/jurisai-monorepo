#!/bin/bash

# JurisAI OpenAI Integration Test Script
# This script tests the OpenAI integration for the JurisAI backend

# Color configuration for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# API Configuration
API_URL="https://jurisai-monorepo-production.up.railway.app"
SUMMARIZE_ENDPOINT="/summarization/text"

echo -e "${YELLOW}Testing JurisAI OpenAI Integration${NC}"
echo "Target API: $API_URL"
echo "Using endpoint: $SUMMARIZE_ENDPOINT"
echo "----------------------------------------"

# Sample Nigerian legal text - stored in variable
SAMPLE_TEXT="IN THE SUPREME COURT OF NIGERIA
HOLDEN AT ABUJA
ON FRIDAY, THE 10TH DAY OF JANUARY, 2020
BEFORE THEIR LORDSHIPS
MARY UKAEGO PETER-ODILI                 JUSTICE, SUPREME COURT
JOHN INYANG OKORO                       JUSTICE, SUPREME COURT
AMINA ADAMU AUGIE                       JUSTICE, SUPREME COURT
UWANI MUSA ABBA-AJI                     JUSTICE, SUPREME COURT
HELEN MORONKEJI OGUNWUMIJU               JUSTICE, SUPREME COURT

APPEAL NO: SC/433/2018
BETWEEN:
AIRTEL NETWORKS LIMITED........................APPELLANT
AND
ANNE MMADUABUCHI & ORS.........................RESPONDENTS

JUDGMENT
(DELIVERED BY MARY UKAEGO PETER-ODILI, JSC)

This is an appeal against the judgment of the Court of Appeal holden at Lagos, delivered on the 16th day of April, 2018 wherein the Court of Appeal set aside the judgment of the Federal High Court, Lagos, which had struck out the Respondents' action for lack of jurisdiction.

According to Airtel's record, the Respondents had initially registered their SIM cards between 2008 and 2010 but did not go through the National Identity Management Commission (NIMC) verification exercise which was concluded in 2013. Consequently, in compliance with the NCC directive, the Appellant deactivated the Respondents' SIM cards in 2015. The Respondents thus filed an action against the Appellant claiming the sum of N120,000,000.00 (One Hundred and Twenty Million Naira) as damages for the deactivation of their telephone lines without due process.

HELD:
The Supreme Court, in a unanimous decision, held that the registration and subsequent deactivation of SIM cards fall within the regulatory powers of the Nigerian Communications Commission (NCC) as established by the Nigerian Communications Act 2003, [2009] LPELR 4526. The Court referred to section 127 of the Nigerian Communications Act 2003 and the Registration of Telephone Subscribers Regulations, 2011.

The directive to deactivate unregistered SIM cards was a proper exercise of regulatory power by the NCC, and the Appellant, as a licensed telecommunications provider, was bound to comply with regulatory directives. Therefore, the Court of Appeal erred in law when it held that the deactivation of the Respondents' SIM cards was wrongful when the Appellant was merely complying with regulatory directives.

Appeal allowed. The Judgment of the Court of Appeal is hereby set aside. The Judgment of the Federal High Court striking out the case for lack of jurisdiction is hereby restored."

# Prepare a temporary JSON file with properly escaped content
cat > /tmp/sample_request.json << EOF
{
  "text": $(jq -n --arg text "$SAMPLE_TEXT" '$text'),
  "max_length": 500,
  "use_ai": true,
  "focus_area": "jurisdiction"
}
EOF

# Test case 1: Text summarization with OpenAI
echo -e "\n${YELLOW}Test Case 1: Text Summarization with OpenAI${NC}"
echo "Sending request to $API_URL$SUMMARIZE_ENDPOINT"

RESPONSE=$(curl -s -X POST "$API_URL$SUMMARIZE_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @/tmp/sample_request.json)

# Check if the request was successful
if [[ $RESPONSE == *"summary"* ]]; then
  echo -e "${GREEN}✓ Received valid response with summary${NC}"
  
  # Extract and display the summary
  SUMMARY=$(echo $RESPONSE | jq -r '.summary')
  echo -e "\nSummary extract:\n${YELLOW}${SUMMARY:0:200}...${NC}"
  
  # Check for key points
  KEY_POINTS=$(echo $RESPONSE | jq -r '.key_points | length')
  echo -e "\nKey points found: ${KEY_POINTS}"
  if [[ $KEY_POINTS -gt 0 ]]; then
    echo -e "${GREEN}✓ Key points were extracted${NC}"
  else
    echo -e "${YELLOW}⚠ No key points were extracted${NC}"
  fi
  
  # Check for citations
  CITATIONS=$(echo $RESPONSE | jq -r '.citations | length')
  echo -e "\nCitations found: ${CITATIONS}"
  if [[ $CITATIONS -gt 0 ]]; then
    echo -e "${GREEN}✓ Legal citations were preserved${NC}"
    echo -e "Sample citations:"
    echo $RESPONSE | jq -r '.citations[] | select(. != null) | .[0:3] | .'
  else
    echo -e "${YELLOW}⚠ No legal citations were preserved${NC}"
  fi
  
  # Verify AI was used
  AI_USED=$(echo $RESPONSE | jq -r '.ai_used')
  if [[ $AI_USED == "true" ]]; then
    echo -e "\n${GREEN}✓ OpenAI integration confirmed - AI was used for summarization${NC}"
  else
    echo -e "\n${RED}✗ AI was not used for summarization${NC}"
  fi
else
  echo -e "${RED}✗ Failed to get valid response${NC}"
  echo "Response received:"
  echo $RESPONSE
fi

# Clean up
rm /tmp/sample_request.json

echo -e "\n${YELLOW}Test completed${NC}"
echo "----------------------------------------"
