property my, navAction, navInfo, active
global objGame

on beginSprite me
  my = sprite(me.spriteNum)
  me.activate()
end

on mouseEnter me
  if active then
    my.blend = 100
    sprite(me.spriteNum).cursor = 280
  else
    sprite(me.spriteNum).cursor = -1
  end if
  objGame.displayNavInfo(navInfo)
end

on mouseUp me
  if active then
    objGame.doNavAction(navAction)
  end if
end

on mouseLeave me
  if active then
    my.blend = 0
    sprite(me.spriteNum).cursor = -1
    objGame.unDisplayNavInfo()
  end if
end

on deactivate me
  active = 0
  my.member = member("nav_button_deactivated")
  my.blend = 50
end

on activate me
  active = 1
  my.member = member("nav_button")
  my.blend = 0
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #navAction, [#default: EMPTY, #format: #static, #comment: "NavAction"])
  addProp(description, #navInfo, [#default: EMPTY, #format: #string, #comment: "Nav Info"])
  return description
end
