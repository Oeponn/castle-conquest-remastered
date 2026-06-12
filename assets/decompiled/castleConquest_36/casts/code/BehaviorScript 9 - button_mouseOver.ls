property my, buttonDown, buttonUp

on beginSprite me
  my = sprite(me.spriteNum)
  buttonUp = my.member
end

on mouseEnter me
  my.member = member(buttonDown)
end

on mouseLeave me
  my.member = member(buttonUp)
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #buttonDown, [#default: "button_", #format: #string, #comment: "buttonDown graphic:"])
  return description
end
