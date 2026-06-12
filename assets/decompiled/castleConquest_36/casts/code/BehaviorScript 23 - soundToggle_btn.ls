property my, soundOnMember, soundOffMember
global objGame, soundOn

on beginSprite me
  soundOnMember = member("soundOn_bmp")
  soundOffMember = member("soundOff_bmp")
  my = sprite(me.spriteNum)
  my.member = soundOnMember
  me.updateIcon()
end

on mouseUp me
  objGame.soundToggle()
  me.updateIcon()
end

on updateIcon me
  if soundOn then
    my.member = soundOnMember
  else
    my.member = soundOffMember
  end if
end
