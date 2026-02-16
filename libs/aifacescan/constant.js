//backupnum 0~9 fingerprint 10:password 11:rfid card ,20-27 is staticface,30-37 is parlm,50 is photo

const BACKUP_TYPE = {
  PASSWORD: 10,
  RFID: 11,
  DELETE_ALL: 13,
  PHOTO: 50
};

export { BACKUP_TYPE };