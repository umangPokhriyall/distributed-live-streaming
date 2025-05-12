import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Validates a TS segment file using ffprobe
 * @param filePath Path to the TS segment
 * @returns Promise resolving to true if valid, false otherwise
 */
export const validateTsSegment = async (filePath: string): Promise<boolean> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[Validator] File not found: ${filePath}`);
      return false;
    }

    // Check if file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(`[Validator] File is empty: ${filePath}`);
      return false;
    }

    // Use ffprobe to check if the file is a valid TS segment
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error(`[Validator] Invalid TS file: ${filePath}`, err.message);
          resolve(false);
          return;
        }

        // Check if the file has video or audio streams
        const hasStreams = metadata.streams && metadata.streams.length > 0;
        if (!hasStreams) {
          console.error(`[Validator] TS file has no streams: ${filePath}`);
          resolve(false);
          return;
        }

        console.log(`[Validator] Valid TS file: ${filePath} with ${metadata.streams.length} streams`);
        resolve(true);
      });
    });
  } catch (error) {
    console.error(`[Validator] Error validating TS file: ${filePath}`, error);
    return false;
  }
};

/**
 * Attempts to repair a corrupt TS segment file
 * @param inputPath Path to the corrupt TS segment
 * @param outputPath Path to save the repaired segment
 * @returns Promise resolving to true if repair successful, false otherwise
 */
export const repairTsSegment = async (inputPath: string, outputPath: string): Promise<boolean> => {
  try {
    console.log(`[Repair] Attempting to repair TS file: ${inputPath}`);
    
    // Create a temporary fixed file
    const tempFile = `${outputPath}.tmp`;
    
    // Use ffmpeg to try to fix the file by re-muxing it
    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c copy',   // Copy streams without re-encoding
          '-f mpegts', // Force MPEG-TS format
          '-bsf:v h264_mp4toannexb' // Bitstream filter that can help with some corruption issues
        ])
        .output(tempFile)
        .on('end', () => {
          console.log(`[Repair] Re-muxing completed: ${tempFile}`);
          
          // Validate the repaired file
          validateTsSegment(tempFile).then(isValid => {
            if (isValid) {
              // Move the temp file to the final output path
              fs.renameSync(tempFile, outputPath);
              console.log(`[Repair] TS file successfully repaired: ${outputPath}`);
              resolve(true);
            } else {
              console.error(`[Repair] Failed to repair TS file`);
              // Clean up temp file
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
              resolve(false);
            }
          });
        })
        .on('error', (err) => {
          console.error(`[Repair] Error during repair:`, err);
          // Clean up temp file
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          resolve(false);
        })
        .run();
    });
  } catch (error) {
    console.error(`[Repair] Error repairing TS file:`, error);
    return false;
  }
}; 