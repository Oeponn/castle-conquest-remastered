property Dir
global objGame, sprNum

on beginSprite me
  sprite(me.spriteNum).visible = 1
end

on mouseUp me
  objGame.castleToggle(Dir)
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #Dir, [#default: -1, #format: #integer, #comment: "toggle direction +1 or -1"])
  return description
end
