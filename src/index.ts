import fetch from 'node-fetch';
import * as action from '@actions/core';
import dotenv from 'dotenv';

dotenv.config();

const headers: any = {
  'Content-Type': 'application/json',
  'X-Holistics-Key': process.env.HOLISTICS_API_KEY,
}

const HOLISTICS_HOST = 'http://127.0.0.1:3000';
const HOLISTICS_API_HOST = `${HOLISTICS_HOST}/api/v2`;

async function submitValidate (commitOid: string, branchName: string) {
  const url = `${HOLISTICS_API_HOST}/aml_studio/projects/submit_validate?commit_oid=${commitOid}&branch_name=${branchName}`;
  const result = await fetch(url, {
    method: 'post',
    headers,
  });
  const status = result.status;
  const respond = await result.json();
  console.log(JSON.stringify(respond, null, 2));
  if (status === 200) {
    return respond.job;
  }
  process.exit(1);
}

async function getJobResut (jobId: number) {
  const url = `${HOLISTICS_API_HOST}/jobs/${jobId}/result`;
  const result = await fetch(url, {
    method: 'get',
    headers,
  });
  return await result.json();
}

async function polling(jobId: number) {
  return new Promise((resolve, reject) => {
    const i = setInterval(async () => {
      console.log('Polling validation result ...');
      const result = await getJobResut(jobId);
      console.log(`Status: ${result.status}`);
      if (result.status === 'success' || result.status === 'failure') {
        clearInterval(i);
        resolve(result);
      }
    }, 2000);
  });
}

async function run () {
  try {
    const job = await submitValidate('791c8dd7438bca5b1c3305b07925d3f47ef8fa88', 'develop');
    const result = await polling(job.id) as any;
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'failure') {
      action.error(result);
      process.exit(1);
    }
    const jobResult = result.result;
    if (jobResult.data.status !== 'success') {
      action.error(result);
      process.exit(1);
    }
    action.setOutput('result', result);
  } catch (error: any) {
    action.error(error);
    process.exit(1);
  }
}
run();