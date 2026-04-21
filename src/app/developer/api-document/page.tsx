"use client";

import CopyButton from "@/components/common/CopyButton";
import SubPageLayout from "@/components/layout/main/SubPageLayout";
import { getBasePath } from "@/lib/config";

const apiEndpoint = `https://thaillm.or.th${getBasePath()}-api/llmaas/chat`;
const codeSnippet = `import requests
import json

url = "${apiEndpoint}"

payload = json.dumps({
  "prompt": "สวัสดี"
})
headers = {
  "x-api-key": "<your-api-key>",
  "Content-Type": "application/json"
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)
`;

const APIDocument = () => {
  return (
    <SubPageLayout
      historyPageList={[
        { name: "API Document", path: "/developer/api-document" },
      ]}
      currentPageName={"LLMaaS"}
    >
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-3xl text-gray-900 font-semibold">
          LLM as a Service
        </h1>

        {/* First Section */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800">API endpoint</h2>
          <div className="grid grid-cols-[4rem_auto_2rem] justify-stretch gap-2 bg-gray-200 p-2 rounded-sm">
            <p className="text-sm font-bold text-white bg-primary-500 p-2 rounded-sm text-center">
              POST
            </p>
            <p className="text-sm text-gray-700 bg-gray-25 p-2 rounded-sm">
              {apiEndpoint}
            </p>
            <CopyButton className="hover:bg-gray-50" text={apiEndpoint} />
          </div>
        </div>

        <hr />

        {/* Second Section */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800">
            Request header
          </h2>
          <ul className="list-disc pl-5">
            <li>
              <p className="text-sm text-gray-700">
                Content-Type: application/json
              </p>
            </li>
            <li>
              <p className="text-sm text-gray-700">
                x-api-key: <b>&lt;your-api-key&gt;</b>
              </p>
            </li>
          </ul>
        </div>

        <hr />

        {/* Third Section */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800">Request body</h2>
          <ul className="list-disc pl-5">
            <li>
              <p className="text-sm text-gray-700">
                prompt &lt;String&gt;: <b>&lt;your-prompt&gt;</b>
              </p>
            </li>
          </ul>
        </div>

        <hr />

        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800">Example</h2>
        </div>
        {/* Code Block */}
        <div className="bg-gray-800 text-white rounded-lg shadow-lg font-mono text-sm relative">
          <div className="absolute top-2 right-2">
            <CopyButton
              className="text-gray-400 hover:text-white hover:bg-gray-700"
              text={codeSnippet}
            />
          </div>
          <div className="overflow-x-auto p-4">
            <pre>
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </SubPageLayout>
  );
};

export default APIDocument;
