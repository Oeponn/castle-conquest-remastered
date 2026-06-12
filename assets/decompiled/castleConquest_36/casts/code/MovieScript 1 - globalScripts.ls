global objGame, sprNum, soundOn

on prepareMovie
  puppetTempo(800)
end

on startMovie
  set the exitLock to 1
  the preferred3dRenderer = #auto
  sprNum = [:]
  sprNum.addProp(#intro_swf, 1)
  sprNum.addProp(#castleUnlock, 2)
  sprNum.addProp(#castlesConquered_bmp, 3)
  sprNum.addProp(#castleSelectButtonFirst, 8)
  sprNum.addProp(#castleSelectButtonLast, 19)
  sprNum.addProp(#gameWorld_w3d, 7)
  sprNum.addProp(#powerMeterContainer_bmp, 23)
  sprNum.addProp(#powerMeter_bmp, 24)
  sprNum.addProp(#accuracyMeter_bmp, 25)
  sprNum.addProp(#powerMeterTint_bmp, 26)
  sprNum.addProp(#rotationDial_bmp, 27)
  sprNum.addProp(#angleDial_bmp, 28)
  sprNum.addProp(#level_txt, 29)
  sprNum.addProp(#flags_txt, 30)
  sprNum.addProp(#restart_txt, 31)
  sprNum.addProp(#accuracyMarker_bmp, 32)
  sprNum.addProp(#gameScore_txt, 33)
  sprNum.addProp(#score_txt, 34)
  sprNum.addProp(#gold_txt, 35)
  sprNum.addProp(#goldScore_txt, 36)
  sprNum.addProp(#tallyNames_txt, 37)
  sprNum.addProp(#tallyTotals_txt, 38)
  sprNum.addProp(#gameOver_txt, 39)
  sprNum.addProp(#hint_txt, 40)
  sprNum.addProp(#toolbarCover_bmp, 42)
  objGame = script("gameClass").new()
  soundOn = 1
  sprite(sprNum.intro_swf).visible = 1
  sprite(sprNum.gameWorld_w3d).visible = 0
  sprite(sprNum.tallyNames_txt).visible = 0
  sprite(sprNum.tallyTotals_txt).visible = 0
  sprite(sprNum.gameOver_txt).visible = 0
  go("miniclipIntro")
end

on stopMovie
  member("gameWorld").resetWorld()
  member("gameScore_txt").text = string(0)
  sprite(sprNum.gameWorld_w3d).visible = 0
end

on keyUp
  objGame.keyUp()
end

on keyDown
end
