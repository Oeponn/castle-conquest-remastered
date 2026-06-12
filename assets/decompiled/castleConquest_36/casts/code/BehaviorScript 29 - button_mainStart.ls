property my, playerCount
global objGame

on beginSprite me
  my = sprite(me.spriteNum)
  my.blend = 0
end

on mouseEnter me
  my.blend = 100
  sprite(me.spriteNum).cursor = 280
end

on mouseUp me
  objGame.startButtonPressed(playerCount)
  go("game")
end

on mouseLeave me
  my.blend = 0
  sprite(me.spriteNum).cursor = -1
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #playerCount, [#default: "1", #format: #integer, #comment: "Number Of Players"])
  return description
end
