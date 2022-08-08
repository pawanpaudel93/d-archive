import type { NextApiRequest, NextApiResponse } from "next";
import { Web3Storage, getFilesFromPath } from "web3.storage";
import { temporaryFile } from "tempy";
import { execFile } from "promisify-child-process";
import { resolve } from "path";
import fsPromises from "node:fs/promises";

type Data = {
  status: string;
  message: string;
  contentID: string;
};

const SINGLEFILE_EXECUTABLE = resolve(
  "..",
  "..",
  "node_modules/single-file-cli/single-file"
);
const BROWSER_PATH = "/usr/bin/google-chrome";
const BROWSER_ARGS = '["--no-sandbox"]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    let tempPath = temporaryFile({ name: "index.html" });
    const url = req.body.url;
    try {
      const command = [
        `--browser-executable-path=${BROWSER_PATH}`,
        `--browser-args='${BROWSER_ARGS}'`,
        url,
        `--output=${tempPath}`,
      ];
      const { stderr } = await execFile(SINGLEFILE_EXECUTABLE, command);
      if (stderr) {
        console.error(stderr);
        return res.status(500).json({
          status: "error",
          message: stderr as string,
          contentID: "",
        });
      }
      const client = new Web3Storage({ token: process.env.WEB3STORAGE_TOKEN });
      const files = await getFilesFromPath(tempPath);
      const cid = await client.put(files, {
        wrapWithDirectory: false,
        maxRetries: 3,
      });
      await fsPromises.rm(tempPath, { recursive: true, force: true });
      return res.status(200).json({
        status: "success",
        message: "Uploaded to Web3.Storage!",
        contentID: cid,
      });
    } catch (error) {
      console.error(error);
      if (tempPath) {
        await fsPromises.rm(tempPath, { recursive: true, force: true });
      }
      return res.status(500).json({
        status: "error",
        message: "Error uploading to Web3.Storage!",
        contentID: "",
      });
    }
  }
}
