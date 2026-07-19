/**
 * 김유빈 · 박지인 청첩장 RSVP 백엔드 (Google Apps Script)
 *
 * 사용법: 이 파일 전체를 복사해서 Google Sheets의
 * [확장 프로그램 > Apps Script] 편집기에 붙여넣고 웹앱으로 배포하세요.
 * 자세한 절차는 함께 제공된 RSVP-설정방법.md 를 참고하세요.
 *
 * 참석자 명단/집계는 별도 관리자 페이지 없이, 이 스크립트가 연결된
 * Google 시트를 직접 열어서 확인합니다.
 */

var SHEET_NAME = "RSVP";
var HEADERS = ["타임스탬프", "이름", "구분", "참석여부", "인원수", "연락처"];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = (data.name || "").toString().trim();
    if (!name) {
      return jsonOutput_({ ok: false, error: "name required" });
    }
    var sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      name,
      (data.side || "").toString(),
      (data.attend || "").toString(),
      (data.count || "").toString(),
      (data.tel || "").toString()
    ]);
    return jsonOutput_({ ok: true });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
