property my, castleName, castlePrice, castleNum, active
global objGame

on beginSprite me
  my = sprite(me.spriteNum)
  me.activate()
end

on mouseEnter me
  if active then
    my.blend = 10
    sprite(me.spriteNum).cursor = 280
  else
    sprite(me.spriteNum).cursor = -1
  end if
  objGame.displayCastleItem(active, castleName, castlePrice)
end

on mouseUp me
  if active then
    objGame.selectCastle(castleNum)
  end if
end

on mouseLeave me
  if active then
    my.blend = 0
    sprite(me.spriteNum).cursor = -1
  end if
  objGame.unDisplayCastleItem()
end

on deactivate me
  active = 0
  my.color = rgb("000000")
  my.blend = 60
end

on activate me
  active = 1
  my.color = rgb("FFFFFF")
  my.blend = 0
end

on getPrice me
  return castlePrice
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #castleName, [#default: EMPTY, #format: #string, #comment: "Castle Name"])
  addProp(description, #castlePrice, [#default: EMPTY, #format: #integer, #comment: "Castle Price"])
  addProp(description, #castleNum, [#default: "1", #format: #integer, #comment: "Castle Number"])
  return description
end
