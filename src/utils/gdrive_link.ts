export function checkGDriveFileID(file_id: string): boolean {
  for (let i = 0; i < file_id.length; i++) {
    const chr = file_id.charCodeAt(i);

    if (chr === 45 || chr === 95) continue;

    if (chr < 48 || (chr > 57 && chr < 65) || (chr > 90 && chr < 97) || chr > 122) {
      return false;
    }
  }

  return true;
}
