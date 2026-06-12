property destination, my

on beginSprite me
  my = sprite(me.spriteNum)
  my.blend = 0
end

on mouseUp me
  if destination <> EMPTY then
    gotoNetPage(destination, "_new")
  end if
end

on mouseEnter me
  my.blend = 100
  sprite(me.spriteNum).cursor = 280
end

on mouseLeave me
  my.blend = 0
  sprite(me.spriteNum).cursor = -1
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #destination, [#default: EMPTY, #format: #string, #comment: "html page:"])
  return description
end
