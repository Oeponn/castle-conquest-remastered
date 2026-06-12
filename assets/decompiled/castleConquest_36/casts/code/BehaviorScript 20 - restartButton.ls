global sprNum

on mouseUp me
  sprite(sprNum.gameScore_txt).member.text = "0"
  sprite(sprNum.restart_txt).visible = 0
  sprite(sprNum.tallyNames_txt).visible = 0
  sprite(sprNum.tallyTotals_txt).visible = 0
  sprite(sprNum.gameOver_txt).visible = 0
  go("intro")
end
